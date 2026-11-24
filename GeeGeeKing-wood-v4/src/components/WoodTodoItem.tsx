import { useState } from "react";
import {
  TodoItem,
  WoodState,
  STATE_LABELS,
  formatDeadline,
  getTodoState,
} from "../utils/urgency";

// 将 sprites/ 目录复制到 src/assets/sprites/wood-v4/ 后即可直接 import
import calmSprite from "../assets/sprites/wood-v4/calm.png";
import urgentSprite from "../assets/sprites/wood-v4/urgent.png";
import criticalSprite from "../assets/sprites/wood-v4/critical.png";
import overdueSprite from "../assets/sprites/wood-v4/overdue.png";
import wateringSprite from "../assets/sprites/wood-v4/watering.png";
import doneSprite from "../assets/sprites/wood-v4/done.png";

export const WOOD_V4_SPRITES: Record<WoodState, string> = {
  calm: calmSprite,
  urgent: urgentSprite,
  critical: criticalSprite,
  overdue: overdueSprite,
  watering: wateringSprite,
  done: doneSprite,
};

/** 在 App 启动时调用一次，预加载 6 张雪碧图，防止首次点击「浇水」闪烁 */
export function preloadWoodSprites(): void {
  Object.values(WOOD_V4_SPRITES).forEach((src) => {
    const img = new Image();
    img.src = src;
  });
}

interface WoodTodoItemProps {
  todo: TodoItem;
  now: number;
  onComplete: (id: string) => void;
  showBadge?: boolean;
}

export function WoodTodoItem({
  todo,
  now,
  onComplete,
  showBadge = true,
}: WoodTodoItemProps) {
  const [isWatering, setIsWatering] = useState(false);

  const state: WoodState = isWatering ? "watering" : getTodoState(todo, now);

  const handleClick = () => {
    if (todo.completed || isWatering) return;
    setIsWatering(true);
  };

  const handleAnimationEnd = () => {
    if (isWatering) {
      setIsWatering(false);
      onComplete(todo.id);
    }
  };

  return (
    <div
      className="wood-card"
      data-state={state}
      onClick={handleClick}
      title={todo.completed ? "已完成" : "点击浇水灭火完成"}
    >
      <img
        className="wood-sprite"
        src={WOOD_V4_SPRITES[state]}
        alt={STATE_LABELS[state]}
        draggable={false}
        onAnimationEnd={handleAnimationEnd}
      />

      <div className="wood-overlay">
        <div className="wood-title-row">
          {showBadge && (
            <span className="arcade-badge">{STATE_LABELS[state]}</span>
          )}
          <span className="arcade-title">{todo.title}</span>
        </div>
        <div className="arcade-deadline">{formatDeadline(todo.deadline)}</div>
      </div>
    </div>
  );
}
