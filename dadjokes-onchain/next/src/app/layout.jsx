import "./globals.css";

export const metadata = {
  title: "Dad Jokes",
  description: "Jokes so bad, you might just be a father.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
