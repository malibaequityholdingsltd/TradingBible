// AmbientDepth — the app-wide 4D/HD atmosphere layer. Two ultra-slow gold
// aurora blobs drift behind everything (above the static backdrop, below
// all content), giving every page cinematic depth + time motion. Pure
// transform animation (GPU-cheap), pointer-transparent, frozen entirely
// under prefers-reduced-motion.
export default function AmbientDepth() {
  return (
    <div aria-hidden className="ambient-4d pointer-events-none fixed inset-0 -z-[5] overflow-hidden">
      <div className="ambient-blob ambient-a absolute -top-[12vh] left-[8vw] h-[46vmax] w-[46vmax] rounded-full" />
      <div className="ambient-blob ambient-b absolute bottom-[-16vh] right-[4vw] h-[40vmax] w-[40vmax] rounded-full" />
      <div className="ambient-shade absolute inset-0" />
    </div>
  );
}
