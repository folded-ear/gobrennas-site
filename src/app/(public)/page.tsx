import { ModeToggle } from "@/components/mode-toggle";
import Login from "@/components/views/login";

export default function Home() {
  return (
    <div className="flex flex-col h-dvh">
      <nav>
        <ModeToggle />
      </nav>
      <main className="flex-1 p-lg">
        <Login />
      </main>
      <footer className="flex gap-[24px] flex-wrap items-center justify-center">
        proudfeet
      </footer>
    </div>
  );
}
