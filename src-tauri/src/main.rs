#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::{
    fs::{self, File, OpenOptions},
    io::{self, Write},
    path::{Path, PathBuf},
    time::{SystemTime, UNIX_EPOCH},
};
use tauri::{AppHandle, Manager};

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct Todo {
    id: String,
    title: String,
    deadline: u64,
    completed: bool,
    // 旧版没有完成时间，读取时保留空值，不把旧记录误算为当天完成。
    #[serde(default, skip_serializing_if = "Option::is_none")]
    completed_at: Option<u64>,
    #[serde(default)]
    dismissed: bool,
}

#[derive(Deserialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
enum TodoChange {
    Add {
        id: String,
        title: String,
        deadline: u64,
    },
    Complete {
        id: String,
    },
    Dismiss {
        id: String,
    },
}

fn current_time_millis() -> Result<u64, String> {
    let elapsed = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|error| format!("无法读取系统时间：{error}"))?;
    u64::try_from(elapsed.as_millis()).map_err(|error| format!("系统时间超出范围：{error}"))
}

fn todos_path(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map(|dir| dir.join("todos.json"))
        .map_err(|error| format!("无法定位待办文件：{error}"))
}

fn read_todos(path: &Path) -> Result<Vec<Todo>, String> {
    match fs::read(path) {
        Ok(data) => {
            serde_json::from_slice(&data).map_err(|error| format!("待办文件无法解析：{error}"))
        }
        Err(error) if error.kind() == io::ErrorKind::NotFound => Ok(Vec::new()),
        Err(error) => Err(format!("无法读取待办：{error}")),
    }
}

fn save_todos(path: &Path, todos: &[Todo]) -> Result<(), String> {
    let data =
        serde_json::to_vec_pretty(todos).map_err(|error| format!("无法转换待办：{error}"))?;
    // 写完并关闭同目录临时文件后再替换，避免写入中断破坏已有待办。
    let temporary = path.with_extension("tmp");
    let write = || -> io::Result<()> {
        let mut file = File::create(&temporary)?;
        file.write_all(&data)?;
        file.sync_all()?;
        drop(file);
        fs::rename(&temporary, path)
    };

    write().map_err(|error| format!("无法保存待办：{error}"))
}

#[tauri::command]
fn list_todos(app: AppHandle) -> Result<Vec<Todo>, String> {
    read_todos(&todos_path(&app)?)
}

#[tauri::command]
fn update_todos(app: AppHandle, change: TodoChange) -> Result<Vec<Todo>, String> {
    update_todos_at(&todos_path(&app)?, change)
}

fn update_todos_at(path: &Path, change: TodoChange) -> Result<Vec<Todo>, String> {
    let dir = path.parent().ok_or("无法定位待办文件夹")?;
    fs::create_dir_all(dir).map_err(|error| format!("无法创建待办文件夹：{error}"))?;

    // 锁定读改写全过程，避免同时打开两个窗口时覆盖彼此新增的事项。
    let lock = OpenOptions::new()
        .write(true)
        .create(true)
        .truncate(false)
        .open(path.with_extension("lock"))
        .map_err(|error| format!("无法打开待办锁：{error}"))?;
    lock.lock()
        .map_err(|error| format!("无法锁定待办：{error}"))?;

    let mut todos = read_todos(path)?;
    match change {
        TodoChange::Add {
            id,
            title,
            deadline,
        } => {
            let title = title.trim();
            if title.is_empty() {
                return Err("请输入事项名称".into());
            }
            if deadline <= current_time_millis()? || deadline > 8_640_000_000_000_000 {
                return Err("截止时间必须晚于当前时间".into());
            }
            if todos.iter().any(|todo| todo.id == id) {
                return Ok(todos);
            }
            todos.push(Todo {
                id,
                title: title.into(),
                deadline,
                completed: false,
                completed_at: None,
                dismissed: false,
            });
        }
        TodoChange::Complete { id } => {
            let todo = todos
                .iter_mut()
                .find(|todo| todo.id == id)
                .ok_or("找不到这条待办")?;
            if todo.completed {
                return Ok(todos);
            }
            todo.completed_at = Some(current_time_millis()?);
            todo.completed = true;
        }
        TodoChange::Dismiss { id } => {
            let todo = todos
                .iter_mut()
                .find(|todo| todo.id == id)
                .ok_or("找不到这条待办")?;
            if todo.dismissed {
                return Ok(todos);
            }
            // 关闭仅影响木堆展示，保留待办及其原有完成状态。
            todo.dismissed = true;
        }
    }
    save_todos(path, &todos)?;
    Ok(todos)
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![list_todos, update_todos])
        .run(tauri::generate_context!())
        .expect("无法启动 GeeGeeKing");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn updates_legacy_todos_without_inventing_completion_dates() {
        let path = std::env::temp_dir().join(format!(
            "geegeeking-todos-{}-{}.json",
            std::process::id(),
            current_time_millis().unwrap()
        ));
        fs::write(
            &path,
            r#"[
                {"id":"legacy","title":"Legacy","deadline":1,"completed":true},
                {"id":"pending","title":"Pending","deadline":2,"completed":false}
            ]"#,
        )
        .unwrap();

        let todos = update_todos_at(
            &path,
            TodoChange::Complete {
                id: "legacy".into(),
            },
        )
        .unwrap();
        assert_eq!(todos[0].completed_at, None);
        assert!(!todos[1].dismissed);

        let complete = serde_json::from_str(r#"{"kind":"complete","id":"pending"}"#).unwrap();
        let todos = update_todos_at(&path, complete).unwrap();
        let completed_at = todos[1].completed_at.unwrap();
        assert!(completed_at > 0);

        let dismiss = serde_json::from_str(r#"{"kind":"dismiss","id":"pending"}"#).unwrap();
        update_todos_at(&path, dismiss).unwrap();

        let stored: serde_json::Value = serde_json::from_slice(&fs::read(&path).unwrap()).unwrap();
        assert!(stored[0].get("completedAt").is_none());
        assert_eq!(stored[1]["completed"], true);
        assert_eq!(stored[1]["completedAt"], completed_at);
        assert_eq!(stored[1]["dismissed"], true);

        fs::remove_file(&path).unwrap();
        fs::remove_file(path.with_extension("lock")).unwrap();
    }
}
