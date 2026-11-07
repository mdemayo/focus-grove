export function EmphasizedText({ text }: { text: string }) {
  return <>{text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => part.startsWith("**") ? <strong key={index} className="font-semibold">{part.slice(2, -2)}</strong> : part)}</>;
}
