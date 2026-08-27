import React from "react";
import { Avatar } from "@chakra-ui/avatar";
import { Box, Text } from "@chakra-ui/layout";

const UserListItem = ({ user, handleFunction }) => {
  return (
    <Box
      onClick={handleFunction}
      cursor="pointer"
      bg="var(--bg-search)"
      color="var(--text-primary)"
      _hover={{
        bg: "var(--color-primary)",
        color: "white",
      }}
      w="100%"
      display="flex"
      alignItems="center"
      px={3}
      py={2.5}
      mb={2}
      borderRadius="lg"
      transition="all 0.15s ease"
    >
      <Avatar
        mr={3}
        size="sm"
        cursor="pointer"
        name={user.name}
        src={user.pic}
      />
      <Box overflow="hidden">
        <Text fontWeight="600" fontSize="sm" isTruncated>
          {user.name}
        </Text>
        <Text fontSize="xs" opacity={0.8} isTruncated>
          {user.email || user.status || "Fire Contact"}
        </Text>
      </Box>
    </Box>
  );
};

export default UserListItem;
