import { Container } from "@/components/ui/layout";
import { ModeToggle } from "@/components/ui/mode-toggle";
import Login from "@/components/views/login";

export default function Home() {
  return (
    <div className="flex flex-col h-dvh">
      <div className="p-lg flex justify-end ">
        <nav>
          <ModeToggle />
        </nav>
      </div>
      <main className="flex-1">
        <Container>
          <div className="border border-divider rounded-large w-[550px] m-auto">
            <Login />
          </div>
        </Container>
      </main>
      <footer className="flex gap-[24px] flex-wrap items-center justify-center">
        proudfeet
      </footer>
    </div>
  );
}
