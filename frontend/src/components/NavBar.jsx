/**
 * components/NavBar.jsx
 * Simple 3-step navigator: Sign Up → Login → Protected.
 */

const STEPS = [
  { id: "signup",    label: "Sign Up" },
  { id: "login",     label: "Login" },
  { id: "protected", label: "Protected" },
];

export default function NavBar({ current, onNavigate, completedSteps = [] }) {
  return (
    <nav className="navbar">
      {STEPS.map((step, i) => {
        const done      = completedSteps.includes(step.id);
        const active    = current === step.id;
        const className = `nav-step ${active ? "active" : ""} ${done ? "done" : ""}`;
        return (
          <button
            key={step.id}
            className={className}
            onClick={() => onNavigate(step.id)}
          >
            <span className="step-num">{done ? "✓" : i + 1}</span>
            <span className="step-label">{step.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
