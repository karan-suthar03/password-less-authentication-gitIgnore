import { NavLink, useNavigate } from "react-router-dom";

export default function Navbar({ user, onLogout }) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await onLogout();
    navigate("/");
  };

  return (
    <header className="navbar">
      <NavLink to="/" className="logo">
        🔑 <span>PassKey</span>SaaS
      </NavLink>

      <nav>
        {user ? (
          <>
            <NavLink to="/dashboard">Dashboard</NavLink>
            <NavLink to="/docs">Docs</NavLink>
            <span style={{ color: "#71717a", fontSize: "0.85rem" }}>
              {user.email}
            </span>
            <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
              Logout
            </button>
          </>
        ) : (
          <>
            <NavLink to="/docs">Docs</NavLink>
            <NavLink to="/login">Login</NavLink>
            <NavLink to="/signup">
              <button className="btn btn-primary btn-sm">Get Started</button>
            </NavLink>
          </>
        )}
      </nav>
    </header>
  );
}
