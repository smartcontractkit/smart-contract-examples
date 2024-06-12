export const Button = ({ onClick, children }) => (
  <button
    className="bg-primaryDark text-primaryLight font-sans px-4 py-2 rounded"
    onClick={onClick}
  >
    {children}
  </button>
);
