import { useState } from "react";
import {
  type TodoItem,
  type WoodState,
  STATE_LABELS,
  formatDeadline,
  getTodoState,
} from "../GeeGeeKing-wood-v4/src/utils/urgency";
import calm from "../GeeGeeKing-wood-v4/sprites/calm.png";
import urgent from "../GeeGeeKing-wood-v4/sprites/urgent.png";
import critical from "../GeeGeeKing-wood-v4/sprites/critical.png";
import overdue from "../GeeGeeKing-wood-v4/sprites/overdue.png";
import watering from "../GeeGeeKing-wood-v4/sprites/watering.png";
import done from "../GeeGeeKing-wood-v4/sprites/done.png";

const sprites: Record<WoodState, string> = { calm, urgent, critical, overdue, watering, done };

export function preloadWoodSprites() {
  for (const src of Object.values(sprites)) {
    new Image().src = src;
  }
}

interface WoodTodoProps {
  todo: TodoItem;
  now: number;
  isSaving: boolean;
  onComplete: (id: string) => Promise<boolean>;
}

export function WoodTodo({ todo, now, isSaving, onComplete }: WoodTodoProps) {
  // 保存成功后播放一次浇水过渡，动画结束才切换到长芽雪碧图。
  const [isWatering, setIsWatering] = useState(false);
  const state = isWatering ? "watering" : getTodoState(todo, now);
  const deadline = formatDeadline(todo.deadline);
  const label = `${todo.title}，截止 ${deadline}，${STATE_LABELS[state]}`;

  return (
    <button
      className="wood-card"
      data-state={state}
      type="button"
      disabled={isSaving || isWatering || todo.completed}
      aria-label={todo.completed ? label : `${label}，点击完成`}
      title={todo.completed ? label : `${label} · 点击浇水完成`}
      onClick={async () => {
        if (await onComplete(todo.id)) setIsWatering(true);
      }}
    >
      <img
        src={sprites[state]}
        className="wood-sprite"
        alt=""
        draggable={false}
        onAnimationEnd={() => setIsWatering(false)}
      />
      <span className="wood-overlay">
        <span className="wood-title-row">
          <span className="arcade-badge">{STATE_LABELS[state]}</span>
          <span className="arcade-title">{todo.title}</span>
        </span>
        <time className="arcade-deadline" dateTime={new Date(todo.deadline).toISOString()}>{deadline}</time>
      </span>
    </button>
  );
}
