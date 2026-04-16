import { computeWordDiff } from "../../lib/diff/textDiff";

interface TextDiffProps {
  before: string;
  after: string;
}

export function TextDiff({ before, after }: TextDiffProps) {
  const parts = computeWordDiff(before, after);

  return (
    <span>
      {parts.map((part, i) => {
        if (part.removed) {
          return (
            <span
              key={i}
              className="bg-red-50 text-red-600 line-through"
            >
              {part.value}
            </span>
          );
        }
        if (part.added) {
          return (
            <span key={i} className="bg-green-50 text-green-600">
              {part.value}
            </span>
          );
        }
        return <span key={i}>{part.value}</span>;
      })}
    </span>
  );
}
