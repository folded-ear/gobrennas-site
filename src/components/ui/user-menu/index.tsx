import { UserAvatarWithFallback } from "@/components/ui/user-avatar";
import { gql, TypedDocumentNode } from "@apollo/client";
import { useQuery } from "@apollo/client/react";
import { Dropdown } from "@heroui/react";
import { useRouter } from "next/navigation";
import { GetProfileQuery } from "./__generated__/index.generated";

type UserMenuProps = {
  onLogout: () => void;
};

const GET_PROFILE: TypedDocumentNode<GetProfileQuery> = gql`
  query getProfile {
    profile {
      me {
        id
        roles
        ...userAvatar
      }
    }
  }
`;

export const UserMenu = ({ onLogout }: UserMenuProps) => {
  const me = useQuery(GET_PROFILE).data?.profile.me;
  const router = useRouter();
  return (
    <Dropdown>
      <Dropdown.Trigger>
        <UserAvatarWithFallback user={me} />
      </Dropdown.Trigger>
      <Dropdown.Popover>
        <Dropdown.Menu>
          <Dropdown.Item onPress={() => router.push("/profile")}>
            Profile
          </Dropdown.Item>
          <Dropdown.Item key="logout" onPress={onLogout}>
            Log Out
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
};
