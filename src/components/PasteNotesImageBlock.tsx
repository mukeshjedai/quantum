"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DEFAULT_IMAGE_WIDTH,
  MAX_IMAGE_WIDTH,
  MIN_IMAGE_WIDTH,
  type PasteImageBlock,
} from "@/lib/wikiPasteEditor";
import styles from "./PasteNotesImageBlock.module.css";

type PasteNotesImageBlockProps = {
  block: PasteImageBlock;
  disabled?: boolean;
  onChange: (patch: Partial<Pick<PasteImageBlock, "width">>) => void;
  onRemove: () => void;
};

export default function PasteNotesImageBlock({
  block,
  disabled = false,
  onChange,
  onRemove,
}: PasteNotesImageBlockProps) {
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const [naturalWidth, setNaturalWidth] = useState<number | null>(null);

  const sliderMax = naturalWidth ? Math.min(MAX_IMAGE_WIDTH, naturalWidth) : MAX_IMAGE_WIDTH;
  const displayWidth = block.width ?? naturalWidth ?? DEFAULT_IMAGE_WIDTH;
  const sliderValue = block.width ?? Math.min(displayWidth, sliderMax);

  const clampWidth = useCallback(
    (value: number) => Math.min(sliderMax, Math.max(MIN_IMAGE_WIDTH, Math.round(value))),
    [sliderMax],
  );

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const delta = e.clientX - drag.startX;
      onChange({ width: clampWidth(drag.startWidth + delta) });
    };
    const onUp = () => {
      dragRef.current = null;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [clampWidth, onChange]);

  const startResize = (e: React.MouseEvent) => {
    if (disabled) return;
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startWidth: sliderValue };
  };

  return (
    <div className={styles.imageBlock}>
      <div className={styles.previewWrap}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={block.url}
          alt={block.alt || "Uploaded image"}
          className={styles.preview}
          style={
            block.width
              ? { width: `${block.width}px` }
              : { maxWidth: "100%", width: "auto", height: "auto" }
          }
          draggable={false}
          onLoad={(e) => {
            const img = e.currentTarget;
            if (img.naturalWidth > 0) setNaturalWidth(img.naturalWidth);
          }}
        />
        <span
          className={styles.resizeHandle}
          role="presentation"
          onMouseDown={startResize}
          title="Drag to resize"
        />
      </div>
      <div className={styles.controls}>
        <input
          type="range"
          className={styles.slider}
          min={MIN_IMAGE_WIDTH}
          max={sliderMax}
          value={sliderValue}
          disabled={disabled}
          onChange={(e) => onChange({ width: clampWidth(Number(e.target.value)) })}
          aria-label="Image width"
        />
        <span className={styles.widthLabel}>
          {block.width ? `${block.width}px` : naturalWidth ? `${naturalWidth}px (auto)` : "Auto"}
        </span>
        <button type="button" className={styles.removeBtn} disabled={disabled} onClick={onRemove}>
          Remove
        </button>
      </div>
      {block.alt ? <p className={styles.alt}>{block.alt}</p> : null}
    </div>
  );
}
