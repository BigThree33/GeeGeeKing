import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { type FormEvent, useEffect, useState } from "react";
import { type TodoItem } from "../GeeGeeKing-wood-v4/src/utils/urgency";
import { preloadWoodSprites, WoodTodo } from "./WoodTodo";

type TodoChange =
  | { kind: "add"; id: string; title: string; deadline: number }
  | { kind: "complete"; id: string };

export default function App() {
  // 加载完成前保持空值，防止读取失败被误认为没有待办。
  const [todos, setTodos] = useState<TodoItem[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // 一次等待一个写入结果，避免重复提交或较早的结果覆盖列表。
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [deadlineInput, setDeadlineInput] = useState("");
  // 初始值与原生窗口配置一致，切换成功后再更新按钮状态。
  const [isPinned, setIsPinned] = useState(true);
  const [isChangingPin, setIsChangingPin] = useState(false);
  // 用一个时钟驱动整张列表，恢复窗口焦点时立即刷新紧迫度。
  const [now, setNow] = useState(Date.now);

  async function loadTodos() {
    setIsLoading(true);
    setError("");
    try {
      setTodos(await invoke<TodoItem[]>("list_todos"));
    } catch (reason) {
      setError(String(reason));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    preloadWoodSprites();
    void loadTodos();
    const refreshNow = () => setNow(Date.now());
    const timer = window.setInterval(refreshNow, 1_000);
    window.addEventListener("focus", refreshNow);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refreshNow);
    };
  }, []);

  async function saveChange(change: TodoChange) {
    setIsSaving(true);
    setError("");
    try {
      setTodos(await invoke<TodoItem[]>("update_todos", { change }));
      return true;
    } catch (reason) {
      setError(String(reason));
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function addTodo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setError("请输入事项名称");
      return;
    }

    const deadline = new Date(deadlineInput).getTime();
    if (!Number.isFinite(deadline) || deadline <= Date.now()) {
      setError("请选择晚于当前时间的截止时间");
      return;
    }

    if (await saveChange({ kind: "add", id: crypto.randomUUID(), title: cleanTitle, deadline })) {
      setTitle("");
      setDeadlineInput("");
    }
  }

  async function togglePin() {
    setIsChangingPin(true);
    try {
      await getCurrentWindow().setAlwaysOnTop(!isPinned);
      setIsPinned(!isPinned);
    } catch {
      setError("窗口置顶切换失败");
    } finally {
      setIsChangingPin(false);
    }
  }

  // 按截止时间统一排序，浇水和完成时保留木头的位置。
  const sortedTodos = todos && [...todos].sort((a, b) => a.deadline - b.deadline);

  return (
    <main className="app">
      <header className="app-header">
        <h1>待办木堆</h1>
        <button
          className="pin-button"
          type="button"
          aria-pressed={isPinned}
          disabled={isChangingPin}
          onClick={togglePin}
        >
          置顶
        </button>
      </header>

      <form className="todo-form" onSubmit={addTodo}>
        <fieldset disabled={todos === null || isSaving}>
          <label htmlFor="todo-title">事项名称</label>
          <input
            id="todo-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="接下来要做什么？"
            required
            autoComplete="off"
          />
          <label htmlFor="todo-deadline">截止时间</label>
          <div className="deadline-field">
            <input
              id="todo-deadline"
              type="datetime-local"
              value={deadlineInput}
              onChange={(event) => setDeadlineInput(event.target.value)}
              required
            />
            <button className="add-button" type="submit">新增</button>
          </div>
        </fieldset>
      </form>

      {error && <p className="message error" role="alert">{error}</p>}

      <section className="todo-list" aria-label="待办列表" aria-busy={isLoading}>
        {isLoading && <p className="message" role="status">正在读取待办…</p>}
        {!isLoading && todos === null && (
          <button className="retry-button" type="button" onClick={loadTodos}>重新读取</button>
        )}
        {sortedTodos?.length === 0 && <p className="message">木堆还是空的，添加第一条待办吧。</p>}
        {sortedTodos && sortedTodos.length > 0 && (
          <ul className="wood-list">
            {sortedTodos.map((todo) => (
              <li key={todo.id}>
                <WoodTodo
                  todo={todo}
                  now={now}
                  isSaving={isSaving}
                  onComplete={(id) => saveChange({ kind: "complete", id })}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
