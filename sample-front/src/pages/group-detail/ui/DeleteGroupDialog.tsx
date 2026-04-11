import { AlertDialog, Button, Flex, Text } from "@radix-ui/themes";

import { useDeleteGroup } from "@/pages/group-detail/model/useDeleteGroup";

type DeleteGroupDialogProps = {
  groupId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
};

export function DeleteGroupDialog({
  groupId,
  open,
  onOpenChange,
  onSuccess,
}: DeleteGroupDialogProps) {
  const { isLoading, error, submit } = useDeleteGroup({
    onSuccess: () => {
      onOpenChange(false);
      onSuccess();
    },
  });

  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Content maxWidth="480px">
        <AlertDialog.Title>Delete Group</AlertDialog.Title>
        <AlertDialog.Description>
          Are you sure you want to delete this group? This action cannot be undone.
        </AlertDialog.Description>

        {error && (
          <Text size="2" color="red" mt="2" as="p">
            {error}
          </Text>
        )}

        <Flex gap="3" mt="4" justify="end">
          <AlertDialog.Cancel>
            <Button variant="soft" color="gray" radius="full">
              Cancel
            </Button>
          </AlertDialog.Cancel>
          <Button
            color="red"
            radius="full"
            disabled={isLoading}
            onClick={() => void submit(groupId)}
          >
            Delete
          </Button>
        </Flex>
      </AlertDialog.Content>
    </AlertDialog.Root>
  );
}
