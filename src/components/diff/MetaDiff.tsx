import { Trans } from "@lingui/react/macro";
import type { MetaDiff as MetaDiffType } from "../../types/diff";

interface MetaDiffProps {
  diff: MetaDiffType;
}

export function MetaDiff({ diff }: MetaDiffProps) {
  if (diff.fields.length === 0 && !diff.linksChanged) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-primary"><Trans>Contact Info</Trans></h3>
      {diff.fields.length > 0 && (
        <table className="w-full text-sm border border-gray-200 rounded">
          <thead>
            <tr className="bg-gray-50 text-left text-xs text-muted">
              <th className="px-3 py-1.5 font-medium"><Trans>Field</Trans></th>
              <th className="px-3 py-1.5 font-medium"><Trans>Before</Trans></th>
              <th className="px-3 py-1.5 font-medium"><Trans>After</Trans></th>
            </tr>
          </thead>
          <tbody>
            {diff.fields.map((f) => (
              <tr key={f.field} className="border-t border-gray-100">
                <td className="px-3 py-1.5 text-muted capitalize">{f.field}</td>
                <td className="px-3 py-1.5 text-red-600">
                  {f.before || <span className="text-light italic no-underline"><Trans>empty</Trans></span>}
                </td>
                <td className="px-3 py-1.5 text-green-600">
                  {f.after || <span className="text-light italic"><Trans>empty</Trans></span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {diff.linksChanged && (
        <p className="text-xs text-muted italic"><Trans>Links have been modified</Trans></p>
      )}
    </div>
  );
}
