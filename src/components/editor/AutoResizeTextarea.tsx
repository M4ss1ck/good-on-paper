import {
  useCallback,
  useLayoutEffect,
  useRef,
  type ComponentPropsWithoutRef,
} from "react";

type AutoResizeTextareaProps = ComponentPropsWithoutRef<"textarea">;

export function AutoResizeTextarea({
  onInput,
  rows = 1,
  style,
  value,
  ...props
}: AutoResizeTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const resize = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    const borderHeight = textarea.offsetHeight - textarea.clientHeight;
    textarea.style.height = `${textarea.scrollHeight + borderHeight}px`;
  }, []);

  useLayoutEffect(() => {
    resize();
  }, [resize, value]);

  return (
    <textarea
      {...props}
      ref={textareaRef}
      rows={rows}
      value={value}
      onInput={(event) => {
        resize();
        onInput?.(event);
      }}
      style={{ overflowY: "hidden", ...style }}
    />
  );
}
