import { RecipeEditIcon, RecipeViewIcon } from "@/components/icons";
import { Button } from "@heroui/react";
import { useRouter } from "next/navigation";
import { PropsWithChildren } from "react";

type ButtonBarButtonProps = PropsWithChildren & {
  href: string;
};

function ButtonBarButton({ href, children }: ButtonBarButtonProps) {
  const router = useRouter();
  return (
    <Button
      isIconOnly
      size="sm"
      variant="tertiary"
      onClick={() => router.push(href)}
    >
      {children}
    </Button>
  );
}

type ButtonBarProps = {
  id: string;
};

export function RecipeActionBar({ id }: ButtonBarProps) {
  return (
    <div className="flex gap-xxs px-xxs">
      <ButtonBarButton href={`/recipes/${id}/edit`}>
        <RecipeEditIcon />
      </ButtonBarButton>
      <ButtonBarButton href={`/recipes/${id}`}>
        <RecipeViewIcon />
      </ButtonBarButton>
    </div>
  );
}
