import { useEffect, useMemo, useState } from "react";
import "./styles/wood-theme-v4.css";
import { WoodTodoItem, preloadWoodSprites } from "./components/WoodTodoItem";
import { TodoItem, sortTodos } from "./utils/urgency";

const STORAGE_KEY = "geegeeking_todos_v1";

function createInitialDemoTodos(): TodoItem[] {
  const now = Date.now();
  const h = 60 * 60 * 1000;
  return [
    { id: "1", title: "修复线上支付 Bug", deadline: now + 0.8 * h, completed: false },
    { id: "2", title: "写产品评审 PPT", deadline: now + 8 * h, completed: false },
    { id: "3", title: "整理下周排期文档", deadline: now + 48 * h, completed: false },
    { id: "4", title: "提交昨日工作日报", deadline: now - 3 * h, completed: false },
    { id: "5", title: "发出本周进度周报", deadline: now + 4 * h, completed: true },
  ];
}

export default function App() {
  const [todos, setTodos] = useState<TodoItem[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as TodoItem[]) : createInitialDemoTodos();
    } catch {
      return createInitialDemoTodos();
    }
  });

  const [now, setNow] = useState(() => Date.now());
  const [title, setTitle] = useState("");
  const [deadlineInput, setDeadlineInput] = useState("");

  useEffect(() => {
    preloadWoodSprites();
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  }, [todos]);

  const sortedTodos = useMemo(() => sortTodos(todos), [todos]);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle || !deadlineInput) return;

    const newItem: TodoItem = {
      id: crypto.randomUUID(),
      title: cleanTitle,
      deadline: new Date(deadlineInput).getTime(),
      completed: false,
    };

    setTodos((prev) => [...prev, newItem]);
    setTitle("");
    setDeadlineInput("");
  };

  const handleComplete = (id: string) => {
    setTodos((prev) =>
      prev.map((item) => (item.id === id ? { ...item, completed: true } : item))
    );
  };

  return (
    <div style={{ width: 356, padding: 10, background: "rgba(31, 21, 28, 0.88)", borderRadius: 8 }}>
      <header
        data-tauri-drag-region
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
          color: "#ffe94d",
          fontFamily: "var(--gee-font)",
          fontWeight: 900,
          cursor: "grab",
        }}
      >
        <span>GeeGeeKing</span>
      </header>

      <form onSubmit={handleAdd} style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="输入待办事项名称..."
          style={{ padding: "6px 8px", fontSize: 13 }}
        />
        <div style={{ display: "flex", gap: 6 }}>
          <input
            type="datetime-local"
            value={deadlineInput}
            onChange={(e) => setDeadlineInput(e.target.value)}
            style={{ flex: 1, padding: "5px 6px", fontSize: 12 }}
          />
          <button type="submit" style={{ padding: "5px 12px", fontWeight: 700, cursor: "pointer" }}>
            新增
          </button>
        </div>
      </form>

      <div className="wood-list">
        {sortedTodos.map((todo) => (
          <WoodTodoItem
            key={todo.id}
            todo={todo}
            now={now}
            onComplete={handleComplete}
          />
        ))}
      </div>
    </div>
  );
}
