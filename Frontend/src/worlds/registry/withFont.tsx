import type { ReactNode } from "react";

export type WorldLayoutProps = {
  children: ReactNode;
};

export function worldLayout(name: string, baseClassName: string, fontClassName: string) {
  function WorldLayout({ children }: WorldLayoutProps) {
    return <div className={`${baseClassName} ${fontClassName}`}>{children}</div>;
  }
  WorldLayout.displayName = name;
  return WorldLayout;
}
