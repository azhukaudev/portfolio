export default function MagicTitle({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <span className="bg-gradient-to-r from-blue-500 to-emerald-300 bg-clip-text text-6xl leading-tight font-extrabold text-transparent">
      {children}
    </span>
  );
}
