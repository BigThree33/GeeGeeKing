export type WoodState =
  | "calm"      // 不急
  | "urgent"    // 急
  | "critical"  // 急死了
  | "overdue"   // 逾期（熄灭焦木）
  | "watering"  // 浇水灭火过渡（瞬态）
  | "done";     // 完成（绿芽小花）

export interface TodoItem {
  id: string;
  title: string;
  /** 截止时间（毫秒时间戳） */
  deadline: number;
  completed: boolean;
}

export const STATE_LABELS: Record<WoodState, string> = {
  calm: "不急",
  urgent: "急",
  critical: "急死了",
  overdue: "灰烬",
  watering: "浇水中",
  done: "DONE",
};

/** 紧迫度阈值（可按个人习惯自由调整） */
export const URGENCY_THRESHOLDS = {
  criticalMs: 2 * 60 * 60 * 1000,   // <= 2 小时：急死了
  urgentMs: 24 * 60 * 60 * 1000,    // <= 24 小时：急
};

/** 根据当前时间计算事项的紧迫度状态 */
export function getTodoState(
  item: TodoItem,
  now: number = Date.now()
): Exclude<WoodState, "watering"> {
  if (item.completed) return "done";
  const diff = item.deadline - now;
  if (diff <= 0) return "overdue";
  if (diff <= URGENCY_THRESHOLDS.criticalMs) return "critical";
  if (diff <= URGENCY_THRESHOLDS.urgentMs) return "urgent";
  return "calm";
}

/** 按截止时间升序排列（已完成的排在底部） */
export function sortTodos(list: TodoItem[]): TodoItem[] {
  return [...list].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return a.deadline - b.deadline;
  });
}

/** 格式化截止时间显示：MM-DD HH:mm */
export function formatDeadline(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
