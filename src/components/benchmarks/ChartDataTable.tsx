import type { ReactNode } from 'react';

export function ChartDataTable({ title, headers, rows }: { title: string; headers: string[]; rows: Array<Array<ReactNode>> }) {
  return <details className="chart-data-details"><summary>View {title.toLowerCase()} data as a table</summary><div className="table-scroll"><table className="chart-data-table"><thead><tr>{headers.map((header) => <th scope="col" key={header}>{header}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={`${title}-${index}`}>{row.map((cell, cellIndex) => <td key={`${index}-${cellIndex}`}>{cell}</td>)}</tr>)}</tbody></table></div></details>;
}
