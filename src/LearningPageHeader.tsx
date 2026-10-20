export default function LearningPageHeader({
  title,
  onBack,
  backLabel = "返回学习",
}: {
  title: string;
  onBack: () => void;
  backLabel?: string;
}) {
  return (
    <header className="learning-page-header">
      <h1>{title}</h1>
      <button className="secondary" onClick={onBack}>
        {backLabel}
      </button>
    </header>
  );
}
