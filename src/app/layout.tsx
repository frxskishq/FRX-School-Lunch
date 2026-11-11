import "./globals.css";
export const metadata = { title: "FRX School Lunch" };
export default function L({ children }: { children: React.ReactNode }) {
  return <html lang="en"><head><meta name="viewport" content="width=device-width, initial-scale=1" /></head><body><main>{children}</main></body></html>;
}
