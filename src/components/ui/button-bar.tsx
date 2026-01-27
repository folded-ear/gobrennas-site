import { RecipeEdit, RecipeView } from "@/components/ui/icons";
import { Button } from "@heroui/react";
import { useRouter } from "next/navigation";
import { PropsWithChildren } from "react";

interface BtnProps extends PropsWithChildren {
  onClick: () => void;
}

const Btn: React.FC<BtnProps> = ({ onClick, children }) => {
  return (
    <Button isIconOnly size="sm" variant="ghost" onClick={onClick}>
      {children}
    </Button>
  );
};

interface Props {
  id: string;
}

export const ButtonBar: React.FC<Props> = ({ id }) => {
  const router = useRouter();
  return (
    <div className="flex gap-1">
      <Btn onClick={() => router.push(`/recipes/${id}/edit`)}>
        <RecipeEdit />
      </Btn>
      <Btn onClick={() => router.push(`/recipes/${id}`)}>
        <RecipeView />
      </Btn>
    </div>
  );
};
