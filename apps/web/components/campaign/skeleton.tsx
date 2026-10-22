export function PageSkeleton() {
  return (
    <div className="mx-auto max-w-[1200px] space-y-6 px-5 pt-32 sm:px-8">
      <div className="skeleton h-10 w-72 rounded-xl" />
      <div className="skeleton h-56 rounded-card" />
      <div className="skeleton h-96 rounded-card" />
    </div>
  );
}
