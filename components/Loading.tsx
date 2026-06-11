export function Loading() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-base-100">
      <img
        src="/icon.png"
        style={{
          width: 175,
          height: 175,
          borderRadius: "50%",
        }}
        className="rotate"
      />
    </div>
  );
}
