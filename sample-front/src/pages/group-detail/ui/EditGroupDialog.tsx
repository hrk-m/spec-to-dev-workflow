import { useState } from "react";
import { Button, Dialog, Flex, Text, TextArea, TextField } from "@radix-ui/themes";

import { useUpdateGroup } from "@/pages/group-detail/model/useUpdateGroup";

type EditGroupDialogProps = {
  groupId: number;
  initialName: string;
  initialDescription: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
};

export function EditGroupDialog({
  groupId,
  initialName,
  initialDescription,
  open,
  onOpenChange,
  onSuccess,
}: EditGroupDialogProps) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [nameError, setNameError] = useState<string | null>(null);

  const { isLoading, error, submit } = useUpdateGroup(groupId, () => {
    onOpenChange(false);
    onSuccess();
  });

  async function handleSave() {
    setNameError(null);

    const trimmedName = name.trim();

    if (trimmedName.length === 0) {
      setNameError("Name is required");
      return;
    }

    if (trimmedName.length > 100) {
      setNameError("Name must be 100 characters or less");
      return;
    }

    await submit({ name: trimmedName, description });
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content maxWidth="480px">
        <Dialog.Title>Edit Group</Dialog.Title>
        <Dialog.Description>Update your group&apos;s name and description.</Dialog.Description>

        <Flex direction="column" gap="4" mt="4">
          <Flex direction="column" gap="1">
            <Text as="label" size="2" weight="medium" htmlFor="edit-group-name">
              Name
            </Text>
            <TextField.Root
              id="edit-group-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Group name"
            />
            {nameError && (
              <Text size="1" color="red">
                {nameError}
              </Text>
            )}
          </Flex>

          <Flex direction="column" gap="1">
            <Text as="label" size="2" weight="medium" htmlFor="edit-group-description">
              Description
            </Text>
            <TextArea
              id="edit-group-description"
              size="2"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
            />
          </Flex>

          {error && (
            <Text size="2" color="red">
              {error}
            </Text>
          )}

          <Flex gap="3" justify="end">
            <Dialog.Close>
              <Button variant="soft" color="gray" radius="full">
                Cancel
              </Button>
            </Dialog.Close>
            <Button onClick={handleSave} disabled={isLoading} radius="full">
              Save
            </Button>
          </Flex>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}
