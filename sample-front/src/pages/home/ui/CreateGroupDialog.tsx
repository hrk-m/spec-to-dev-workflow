import { useState } from "react";
import { Box, Button, Dialog, Flex, Text, TextArea, TextField } from "@radix-ui/themes";
import { FaPlus } from "react-icons/fa6";

import { useCreateGroup } from "@/pages/home/model/useCreateGroup";
import { dialogStyles } from "./CreateGroupDialog.styles";

export function CreateGroupDialog() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const { isLoading, error, nameError, submit, setNameError, setError } = useCreateGroup();

  const handleCreate = () => {
    submit({ name, description });
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setName("");
      setDescription("");
      setNameError(null);
      setError(null);
    }
  };

  return (
    <Dialog.Root onOpenChange={handleOpenChange}>
      <Dialog.Trigger>
        <Button type="button" size="2" radius="full">
          <FaPlus aria-hidden="true" />
          Create Group
        </Button>
      </Dialog.Trigger>
      <Dialog.Content style={dialogStyles.content}>
        <Dialog.Title style={dialogStyles.title}>Create Group</Dialog.Title>
        <Dialog.Description style={dialogStyles.description}>
          Add a new group to your workspace.
        </Dialog.Description>

        <Box style={dialogStyles.fieldGroup}>
          <Text as="label" htmlFor="create-group-name" style={dialogStyles.label}>
            Name
          </Text>
          <TextField.Root
            id="create-group-name"
            size="2"
            placeholder="Group name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (nameError) setNameError(null);
            }}
          />
          {nameError && (
            <Text as="p" style={dialogStyles.fieldError}>
              {nameError}
            </Text>
          )}
        </Box>

        <Box style={dialogStyles.fieldGroup}>
          <Text as="label" htmlFor="create-group-description" style={dialogStyles.label}>
            Description
          </Text>
          <TextArea
            id="create-group-description"
            size="2"
            placeholder="Optional description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Box>

        {error && (
          <Box style={dialogStyles.apiError}>
            <Text as="p" style={{ margin: 0 }}>
              {error}
            </Text>
          </Box>
        )}

        <Flex style={dialogStyles.actions}>
          <Dialog.Close>
            <Button type="button" variant="soft" size="2" radius="full">
              Cancel
            </Button>
          </Dialog.Close>
          <Button type="button" size="2" radius="full" disabled={isLoading} onClick={handleCreate}>
            Create
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}
