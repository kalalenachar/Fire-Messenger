import React from "react";
import { Box, Table, Thead, Tbody, Tr, Th, Td, Text, Code, ListItem, UnorderedList, OrderedList, Link } from "@chakra-ui/react";

// Parse inline Markdown (bold, italic, inline code, links)
const parseInlineMarkdown = (text) => {
  if (!text) return "";

  let parts = [text];

  const splitByPattern = (inputArray, regex, renderFn) => {
    const result = [];
    inputArray.forEach((item) => {
      if (typeof item !== "string") {
        result.push(item);
        return;
      }
      let match;
      let lastIndex = 0;
      const re = new RegExp(regex);
      while ((match = re.exec(item)) !== null) {
        if (match.index > lastIndex) {
          result.push(item.substring(lastIndex, match.index));
        }
        result.push(renderFn(match[1] || match[0], match));
        lastIndex = re.lastIndex;
      }
      if (lastIndex < item.length) {
        result.push(item.substring(lastIndex));
      }
    });
    return result;
  };

  // 1. Links [title](url)
  parts = splitByPattern(parts, /\[([^\]]+)\]\(([^)]+)\)/g, (matchText, m) => (
    <Link href={m[2]} isExternal color="var(--color-primary)" textDecoration="underline" key={Math.random()}>
      {m[1]}
    </Link>
  ));

  // 2. Bold **text** or __text__
  parts = splitByPattern(parts, /\*\*([^*]+)\*\*|__([^_]+)__/g, (matchText) => (
    <strong key={Math.random()} style={{ fontWeight: "700" }}>
      {matchText}
    </strong>
  ));

  // 3. Inline code `code`
  parts = splitByPattern(parts, /`([^`]+)`/g, (matchText) => (
    <Code key={Math.random()} px={1.5} py={0.5} borderRadius="md" bg="var(--bg-search)" color="var(--text-primary)" fontSize="0.85em" border="1px solid var(--color-border)">
      {matchText}
    </Code>
  ));

  // 4. Italic *text* or _text_
  parts = splitByPattern(parts, /(?<!\*)\*([^*]+)\*(?!\*)|(?<!_)_([^_]+)_(?!_)/g, (matchText) => (
    <em key={Math.random()}>{matchText}</em>
  ));

  return parts;
};

const FormattedMarkdown = ({ content = "" }) => {
  if (!content) return null;

  const lines = content.split("\n");
  const elements = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // --- 1. TABLE DETECTOR ---
    if (trimmed.startsWith("|") && trimmed.endsWith("|") && i + 1 < lines.length && lines[i + 1].includes("---")) {
      const tableRows = [];
      const headerLine = lines[i];
      const headers = headerLine
        .split("|")
        .slice(1, -1)
        .map((cell) => cell.trim());

      i += 2; // Skip header and divider lines

      while (i < lines.length && lines[i].trim().startsWith("|")) {
        const rowCells = lines[i]
          .split("|")
          .slice(1, -1)
          .map((cell) => cell.trim());
        tableRows.push(rowCells);
        i++;
      }

      elements.push(
        <Box key={`table-${i}-${Math.random()}`} my={3} overflowX="auto" borderRadius="lg" border="1px solid var(--color-border)" boxShadow="var(--shadow-sm)">
          <Table size="sm" variant="simple" style={{ borderCollapse: "collapse", width: "100%" }}>
            <Thead bg="var(--bg-search)">
              <Tr>
                {headers.map((h, idx) => (
                  <Th
                    key={idx}
                    color="var(--text-primary)"
                    fontWeight="700"
                    py={2.5}
                    px={3}
                    borderBottom="2px solid var(--color-border)"
                    textTransform="none"
                    fontSize="xs"
                    letterSpacing="0.02em"
                  >
                    {parseInlineMarkdown(h)}
                  </Th>
                ))}
              </Tr>
            </Thead>
            <Tbody bg="var(--bg-card)">
              {tableRows.map((row, rIdx) => (
                <Tr key={rIdx} _hover={{ bg: "var(--bg-hover)" }}>
                  {row.map((cell, cIdx) => (
                    <Td key={cIdx} py={2} px={3} borderBottom="1px solid var(--color-border)" fontSize="xs" color="var(--text-primary)">
                      {parseInlineMarkdown(cell)}
                    </Td>
                  ))}
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      );
      continue;
    }

    // --- 2. HEADINGS ---
    if (trimmed.startsWith("### ")) {
      elements.push(
        <Text key={`h3-${i}`} fontWeight="700" fontSize="md" mt={3} mb={1} color="var(--text-primary)">
          {parseInlineMarkdown(trimmed.replace(/^###\s+/, ""))}
        </Text>
      );
      i++;
      continue;
    }
    if (trimmed.startsWith("## ")) {
      elements.push(
        <Text key={`h2-${i}`} fontWeight="700" fontSize="lg" mt={4} mb={1.5} color="var(--text-primary)">
          {parseInlineMarkdown(trimmed.replace(/^##\s+/, ""))}
        </Text>
      );
      i++;
      continue;
    }
    if (trimmed.startsWith("# ")) {
      elements.push(
        <Text key={`h1-${i}`} fontWeight="700" fontSize="xl" mt={4} mb={2} color="var(--text-primary)">
          {parseInlineMarkdown(trimmed.replace(/^#\s+/, ""))}
        </Text>
      );
      i++;
      continue;
    }

    // --- 3. BULLET LISTS ---
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      const listItems = [];
      while (i < lines.length && (lines[i].trim().startsWith("- ") || lines[i].trim().startsWith("* "))) {
        listItems.push(lines[i].trim().replace(/^[-*]\s+/, ""));
        i++;
      }
      elements.push(
        <UnorderedList key={`ul-${i}`} my={2} pl={4} spacing={1.5} color="var(--text-primary)">
          {listItems.map((item, idx) => (
            <ListItem key={idx} fontSize="sm">
              {parseInlineMarkdown(item)}
            </ListItem>
          ))}
        </UnorderedList>
      );
      continue;
    }

    // --- 4. NUMBERED LISTS ---
    if (/^\d+\.\s+/.test(trimmed)) {
      const listItems = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        listItems.push(lines[i].trim().replace(/^\d+\.\s+/, ""));
        i++;
      }
      elements.push(
        <OrderedList key={`ol-${i}`} my={2} pl={4} spacing={1.5} color="var(--text-primary)">
          {listItems.map((item, idx) => (
            <ListItem key={idx} fontSize="sm">
              {parseInlineMarkdown(item)}
            </ListItem>
          ))}
        </OrderedList>
      );
      continue;
    }

    // --- 5. CODE BLOCK ---
    if (trimmed.startsWith("```")) {
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++;
      elements.push(
        <Box key={`code-${i}`} my={2} p={3} bg="var(--bg-search)" border="1px solid var(--color-border)" borderRadius="md" fontFamily="monospace" fontSize="xs" overflowX="auto" color="var(--text-primary)">
          <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{codeLines.join("\n")}</pre>
        </Box>
      );
      continue;
    }

    // --- 6. REGULAR PARAGRAPH OR EMPTY LINE ---
    if (trimmed === "") {
      elements.push(<Box key={`space-${i}`} h="4px" />);
    } else {
      elements.push(
        <Text key={`p-${i}`} fontSize="sm" lineHeight="1.55" color="var(--text-primary)">
          {parseInlineMarkdown(line)}
        </Text>
      );
    }
    i++;
  }

  return <Box w="100%">{elements}</Box>;
};

export default FormattedMarkdown;
