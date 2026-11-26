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
struct Todo {
    id: String,
    title: String,
    deadline: u64,
    completed: bool,
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
    let path = todos_path(&app)?;
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

    let mut todos = read_todos(&path)?;
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
            let now = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .map_err(|error| format!("无法读取系统时间：{error}"))?;
            if u128::from(deadline) <= now.as_millis() || deadline > 8_640_000_000_000_000 {
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
            todo.completed = true;
        }
    }
    save_todos(&path, &todos)?;
    Ok(todos)
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![list_todos, update_todos])
        .run(tauri::generate_context!())
        .expect("无法启动 GeeGeeKing");
}
