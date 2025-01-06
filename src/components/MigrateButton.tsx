import React from 'react';
import { Button } from 'react-native';
import migrateShopsToGeo from '../scripts/migrateShopsToGeo';

const MigrateButton = () => {
  const handleMigration = async () => {
    try {
      await migrateShopsToGeo();
    } catch (error) {
      console.error('Migration failed:', error);
    }
  };

  return (
    <Button 
      title="Migrate Shops Data" 
      onPress={handleMigration}
    />
  );
};

export default MigrateButton;
