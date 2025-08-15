import React from "react";
import { Card, Group, Text } from "@mantine/core";

interface UserInfoProps {
    playerName: string;
}

const UserInfo: React.FC<UserInfoProps> = ({ playerName }) => {
    return (
        <Card 
            shadow="sm" 
            padding="xs" 
            radius="xl"
            style={{
                position: 'absolute',
                top: 10,
                right: 20,
                zIndex: 100
            }}
        >
            <Group gap="xs">
                <Text size="sm" c="dimmed" fw={700}>Player:</Text>
                <Text size="sm" fw={700} c="blue">{playerName}</Text>
            </Group>
        </Card>
    );
};

export default UserInfo;
