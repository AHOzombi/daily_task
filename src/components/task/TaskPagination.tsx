type Props = {
  page: number;
  totalPages: number;
  updating?: boolean;
  onChange: (page: number) => void;
};

export function TaskPagination({ page, totalPages, updating = false, onChange }: Props) {
  return (
    <div className="task-pagination">
      <button type="button" disabled={updating || page <= 1} onClick={() => onChange(page - 1)}>上一页</button>
      <span>{updating ? '正在切换页面…' : `第 ${page} / ${Math.max(1, totalPages)} 页`}</span>
      <button type="button" disabled={updating || page >= totalPages} onClick={() => onChange(page + 1)}>下一页</button>
    </div>
  );
}
