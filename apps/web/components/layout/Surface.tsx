type SurfaceProps = {
  title?: string;
  children: React.ReactNode;
};

export function Surface({ title, children }: SurfaceProps) {
  return (
    <section className="surface">
      {title ? <h3>{title}</h3> : null}
      {children}
    </section>
  );
}

