import { Button } from "@heroui/react";
import { useRouter } from "next/navigation";
import { PropsWithChildren } from "react";

type ButtonBarButtonProps = PropsWithChildren & {
  href: string;
};

export function ButtonBarButton({ href, children }: ButtonBarButtonProps) {
  const router = useRouter();
  return (
    <Button
      isIconOnly
      size="sm"
      variant="ghost"
      onClick={() => router.push(href)}
    >
      {children}
    </Button>
  );
}
