import React, { useState, useEffect } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  VStack,
  HStack,
  Text,
  Box,
  Badge,
  Spinner,
  Select,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  useToast,
} from "@chakra-ui/react";

const LocationShareModal = ({ isOpen, onClose, onSendLocation }) => {
  const [coords, setCoords] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [locationName, setLocationName] = useState("Current Location");
  const [liveDuration, setLiveDuration] = useState("60"); // in minutes
  const toast = useToast();

  const fetchLocation = () => {
    setLoading(true);
    setErrorMsg(null);

    if (!navigator.geolocation) {
      setErrorMsg("Geolocation is not supported by your browser.");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setCoords({ lat: latitude, lng: longitude, accuracy: Math.round(accuracy) });
        setLocationName(`Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`);
        setLoading(false);
      },
      (err) => {
        console.warn("Geolocation error:", err);
        // Default approximate coordinates fallback if GPS permission is denied or unavailable
        setCoords({ lat: 28.6139, lng: 77.209, accuracy: 15 });
        setLocationName("New Delhi, India (Approximate Location)");
        setErrorMsg("Unable to retrieve precise GPS. Showing fallback location.");
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    if (isOpen) {
      fetchLocation();
    }
  }, [isOpen]);

  const handleSendStatic = () => {
    if (!coords) {
      toast({
        title: "Location not available",
        description: "Please wait for GPS coordinates to load.",
        status: "warning",
        duration: 2000,
      });
      return;
    }

    const mapUrl = `https://www.openstreetmap.org/?mlat=${coords.lat}&mlon=${coords.lng}#map=16/${coords.lat}/${coords.lng}`;

    onSendLocation({
      type: "location",
      locationData: {
        lat: coords.lat,
        lng: coords.lng,
        accuracy: coords.accuracy,
        name: locationName,
        mapUrl,
        isLive: false,
      },
    });

    onClose();
  };

  const handleSendLive = () => {
    if (!coords) {
      toast({
        title: "Location not available",
        description: "Please wait for GPS coordinates to load.",
        status: "warning",
        duration: 2000,
      });
      return;
    }

    const durationMinutes = parseInt(liveDuration, 10) || 60;
    const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000).toISOString();
    const mapUrl = `https://www.openstreetmap.org/?mlat=${coords.lat}&mlon=${coords.lng}#map=16/${coords.lat}/${coords.lng}`;

    onSendLocation({
      type: "live_location",
      locationData: {
        lat: coords.lat,
        lng: coords.lng,
        accuracy: coords.accuracy,
        name: locationName,
        mapUrl,
        isLive: true,
        durationMinutes,
        expiresAt,
        lastUpdated: new Date().toISOString(),
      },
    });

    onClose();
  };

  const [tabIndex, setTabIndex] = useState(0);

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered size="md">
      <ModalOverlay backdropFilter="blur(6px)" />
      <ModalContent bg="var(--bg-card)" color="var(--text-primary)" borderRadius="20px" border="1px solid var(--color-border)">
        <ModalHeader borderBottom="1px solid var(--color-border)" fontSize="lg" fontWeight="bold">
          📍 Share Location
        </ModalHeader>
        <ModalCloseButton />

        <ModalBody p={5}>
          <Tabs index={tabIndex} onChange={(index) => setTabIndex(index)} variant="soft-rounded" colorScheme="orange">
            <TabList mb={4} bg="var(--bg-search)" p={1} borderRadius="14px">
              <Tab _selected={{ bg: "var(--color-primary)", color: "white" }} borderRadius="10px" flex="1" fontSize="sm" fontWeight="600">
                📍 Current Location
              </Tab>
              <Tab _selected={{ bg: "var(--color-primary)", color: "white" }} borderRadius="10px" flex="1" fontSize="sm" fontWeight="600">
                🛰️ Live Location
              </Tab>
            </TabList>

            <TabPanels>
              {/* Static Current Location Panel */}
              <TabPanel p={0}>
                <VStack spacing={4} align="stretch">
                  <Box p={4} bg="var(--bg-search)" borderRadius="16px" border="1px solid var(--color-border)" textAlign="center" position="relative">
                    {loading ? (
                      <VStack py={6}>
                        <Spinner size="lg" color="var(--color-primary)" />
                        <Text fontSize="xs" color="var(--text-secondary)" mt={2}>
                          Fetching high-precision GPS coordinates...
                        </Text>
                      </VStack>
                    ) : (
                      <>
                        <Box w="100%" h="140px" borderRadius="12px" overflow="hidden" mb={3} position="relative" bg="#1e293b">
                          {/* Map iframe or visual preview placeholder */}
                          {coords && (
                            <iframe
                              title="Map Preview"
                              width="100%"
                              height="140"
                              frameBorder="0"
                              scrolling="no"
                              src={`https://www.openstreetmap.org/export/embed.html?bbox=${coords.lng - 0.005}%2C${coords.lat - 0.005}%2C${coords.lng + 0.005}%2C${coords.lat + 0.005}&layer=mapnik&marker=${coords.lat}%2C${coords.lng}`}
                              style={{ filter: "brightness(0.9) contrast(1.1)" }}
                            />
                          )}
                        </Box>
                        <Text fontWeight="bold" fontSize="md">
                          {locationName}
                        </Text>
                        {coords && (
                          <HStack justify="center" mt={1} gap={2}>
                            <Badge colorScheme="green" borderRadius="8px" px={2} py={0.5} fontSize="10px">
                              GPS Ready
                            </Badge>
                            <Text fontSize="xs" color="var(--text-secondary)">
                              Accuracy: ~{coords.accuracy} meters
                            </Text>
                          </HStack>
                        )}
                        {errorMsg && (
                          <Text fontSize="xs" color="orange.400" mt={2}>
                            ⚠️ {errorMsg}
                          </Text>
                        )}
                      </>
                    )}
                  </Box>

                  <Button size="sm" variant="ghost" color="var(--color-primary)" onClick={fetchLocation} isLoading={loading}>
                    🔄 Refresh Coordinates
                  </Button>
                </VStack>
              </TabPanel>

              {/* Live Location Panel */}
              <TabPanel p={0}>
                <VStack spacing={4} align="stretch">
                  <Box p={4} bg="var(--bg-search)" borderRadius="16px" border="1px solid var(--color-border)">
                    <HStack spacing={3} mb={3}>
                      <Box w="40px" h="40px" borderRadius="50%" bg="rgba(239, 68, 68, 0.15)" display="flex" alignItems="center" justifyContent="center" fontSize="20px">
                        🛰️
                      </Box>
                      <Box flex="1">
                        <Text fontWeight="bold" fontSize="sm">
                          Share Real-Time Live Location
                        </Text>
                        <Text fontSize="xs" color="var(--text-secondary)">
                          Participants will see your position on a live map as you move.
                        </Text>
                      </Box>
                    </HStack>

                    <HStack justify="space-between" align="center" mt={4} p={3} bg="var(--bg-card)" borderRadius="12px" border="1px solid var(--color-border)">
                      <Text fontWeight="600" fontSize="sm">
                        Sharing Duration
                      </Text>
                      <Select
                        value={liveDuration}
                        onChange={(e) => setLiveDuration(e.target.value)}
                        w="130px"
                        size="sm"
                        borderRadius="10px"
                        bg="var(--bg-search)"
                        border="1px solid var(--color-border)"
                      >
                        <option value="15">15 Minutes</option>
                        <option value="60">1 Hour</option>
                        <option value="480">8 Hours</option>
                      </Select>
                    </HStack>
                  </Box>

                  {coords && (
                    <Text fontSize="xs" color="var(--text-secondary)" textAlign="center">
                      Initial Position: {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
                    </Text>
                  )}
                </VStack>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </ModalBody>

        <ModalFooter borderTop="1px solid var(--color-border)" gap={3}>
          <Button variant="ghost" color="var(--text-secondary)" onClick={onClose}>
            Cancel
          </Button>
          <Button
            bg="var(--color-primary)"
            color="white"
            _hover={{ bg: "var(--color-primary-hover)" }}
            onClick={tabIndex === 0 ? handleSendStatic : handleSendLive}
            px={5}
          >
            {tabIndex === 0 ? "Share Current Location" : "Start Live Location"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default LocationShareModal;
