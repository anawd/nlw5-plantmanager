import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { format } from 'date-fns';


export interface PlantsProps {
  id: string;
  name: string;
  about: string;
  water_tips: string;
  photo: string;
  environments: [string];
  frequency: {
    times: number;
    repeat_every: string;
  };
  hour: string;
  dateTimeNotification: Date;
}

export interface StoragePlantsProps {
  [id: string]: {
    data: PlantsProps;
    notificantionId: string;
  }
}

export async function savePlant(plant: PlantsProps): Promise<void> {
  //Permissão para notificação Dispositivo IOS
  const settings = await Notifications.getPermissionsAsync();
  if (!settings.granted) {
    await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
        allowAnnouncements: true,
      },
    });
  }
  try {
    const nextTime = new Date(plant.dateTimeNotification);
    const now = new Date();

    const { times, repeat_every } = plant.frequency;
    if (repeat_every == 'week') {
      const interval = Math.trunc(7 / times);
      nextTime.setDate(now.getDate() + interval);
    }
    else
      nextTime.setDate(nextTime.getDate() + 1)

    const seconds = Math.abs(
      Math.ceil(now.getTime() - nextTime.getTime()) / 1000);

    const notificantionId = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Heeym 🌱',
        body: `Está na hora de cuidar da sua plantinha ${plant.name}`,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        data: {
          plant,
        },
      },
      trigger: {
        seconds: seconds < 60 ? 60 : seconds,
        repeats: true
      }
    })

    const data = await AsyncStorage.getItem('@plantmanager:plants');
    const oldPlants = data ? (JSON.parse(data) as StoragePlantsProps) : {};

    const newPlant = {
      [plant.id]: {
        data: plant,
        notificantionId
      }
    }

    await AsyncStorage.setItem('@plantmanager:plants',
      JSON.stringify({
        ...newPlant,
        ...oldPlants
      }));
  } catch (error) {
    throw new Error(error);
  }
}

export async function loadPlant(): Promise<PlantsProps[]> {
  try {
    const data = await AsyncStorage.getItem('@plantmanager:plants');
    const plants = data ? (JSON.parse(data) as StoragePlantsProps) : {};

    const plantsSorted = Object
      .keys(plants)
      .map(plant => {
        return {
          ...plants[plant].data,
          hour: format(new Date(plants[plant].data.dateTimeNotification), 'HH:mm')
        }
      })
      .sort((a, b) =>
        Math.floor(
          new Date(a.dateTimeNotification).getTime() / 1000 -
          Math.floor(new Date(b.dateTimeNotification).getTime() / 1000)
        )
      );

    return plantsSorted;

  } catch (error) {
    throw new Error(error);
  }
}

export async function removePlant(id: string): Promise<void> {
  const data = await AsyncStorage.getItem('@plantmanager:plants');
  const plants = data ? (JSON.parse(data) as StoragePlantsProps) : {};

  await Notifications.cancelScheduledNotificationAsync(plants[id].notificantionId);
  delete plants[id];

  await AsyncStorage.setItem(
    '@plantmanager:plants',
    JSON.stringify(plants)
  );
}