import { ReactNode, useContext, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { Link } from "react-router-dom";
import { BusyContext, pretty } from "./workspace-utils";

export function Brand({ inverse = false }: { inverse?: boolean }) {
  return <Link to="/" className={`ms-brand ${inverse ? "inverse" : ""}`} aria-label="Milestone home"><span><svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M5 23V9l11 8L27 9v14M5 9l11-5 11 5M16 17v11" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg></span><b>milestone<span className="brand-period">.</span></b></Link>;
}

export function Button({ children, onClick, secondary, disabled, type = "button" }: {
  children: ReactNode; onClick?: () => void; secondary?: boolean; disabled?: boolean; type?: "button" | "submit";
}) {
  const busy = useContext(BusyContext);
  return <button type={type} className={`ms-button ${secondary ? "secondary" : ""}`} onClick={onClick} disabled={disabled || busy}>{children}</button>;
}

export function Badge({ value }: { value: string }) {
  const tone = ["completed", "accepted", "locked", "COMPLETED", "Matched", "resolved", "sandbox"].includes(value) ? "green"
    : value.includes("resolution") || value === "Review" ? "rose" : ["delivery_review", "in_review", "Advisory only"].includes(value) ? "violet" : "blue";
  return <span className={`ms-badge ${tone}`}><i />{value === "demo" ? "Sample data" : pretty(value)}</span>;
}

export function Empty({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return <div className="ms-empty"><span>{icon}</span><h3>{title}</h3><p>{body}</p></div>;
}

export function Modal({ title, children, onClose, wide = false }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  const panel = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusables = () => Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input, textarea, select, a[href], [tabindex="0"]') ?? []);
    (panel.current?.querySelector<HTMLElement>("input, textarea, select") ?? focusables()[0])?.focus();
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeRef.current();
      if (event.key === "Tab") {
        const elements = focusables();
        if (event.shiftKey && document.activeElement === elements[0]) { event.preventDefault(); elements.at(-1)?.focus(); }
        if (!event.shiftKey && document.activeElement === elements.at(-1)) { event.preventDefault(); elements[0]?.focus(); }
      }
    };
    document.addEventListener("keydown", keyboard);
    return () => { document.body.style.overflow = overflow; document.removeEventListener("keydown", keyboard); previous?.focus(); };
  }, []);
  return <div className="modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div ref={panel} className={`modal-panel ${wide ? "wide" : ""}`} role="dialog" aria-modal="true" aria-label={title}>
    <div className="modal-heading"><h2>{title}</h2><button aria-label="Close dialog" onClick={onClose}><X /></button></div>{children}
  </div></div>;
}

