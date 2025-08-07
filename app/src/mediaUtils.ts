import { Platform } from "react-native";

// import * as Linking from "expo-linking";
// import * as Location from "expo-location";
// import * as Permissions from "expo-permissions";
import * as ImagePicker from "expo-image-picker";

// export default async function getPermissionAsync(
//   permission: Permissions.PermissionType
// ) {
//   const { status } = await Permissions.askAsync(permission);
//   if (status !== "granted") {
//     const permissionName = permission.toLowerCase().replace("_", " ");
//     Alert.alert(
//       "Cannot be done 😞",
//       `If you would like to use this feature, you'll need to enable the ${permissionName} permission in your phone settings.`,
//       [
//         {
//           text: "Let's go!",
//           onPress: () => Linking.openURL("app-settings:"),
//         },
//         { text: "Nevermind", onPress: () => { }, style: "cancel" },
//       ],
//       { cancelable: true }
//     );
// 
//     return false;
//   }
//   return true;
// }

// export async function getLocationAsync(
//   onSend: (locations: { location: Location.LocationObjectCoords }[]) => void
// ) {
//   if (await Location.requestForegroundPermissionsAsync()) {
//     const location = await Location.getCurrentPositionAsync({});
//     if (location) {
//       onSend([{ location: location.coords }]);
//     }
//   }
// }

// what we need to upload to CloudFront
type FileUpload = {
  blob: Blob;
  type: string;
};

// {"assets": [
// {"assetId": null, "base64": null, "duration": null, "exif": null, "height": 1080, "rotation": null, "type": "image", "uri": "file:///data/user/0/chat.gatz/cache/ImagePicker/2e0a0b22-a523-41a0-8680-9bf1acb81806.png", "width": 1080}],
// "canceled": false, "cancelled": false}

// this works in iOS which generates a url like `file:///var/mobile/Containers/Data/Application/...`
const prepareImagePickerFileUpload = async ({
  uri,
  type,
}: ImagePicker.ImagePickerAsset): Promise<FileUpload> => {
  const blob = await fetch(uri).then((response) => response.blob());

  return { blob, type };
};

type WebFile = { uri: string };

const prepareWebFileUpload = async (file: WebFile): Promise<FileUpload> => {
  const response = await fetch(file.uri);
  const blob = await response.blob();
  
  // Try to determine type from URI for data URLs (common in web)
  let type = undefined;
  if (file.uri.startsWith('data:')) {
    const mimeMatch = file.uri.match(/^data:([^;]+);/);
    if (mimeMatch && mimeMatch[1]) {
      type = mimeMatch[1];
    }
  }
  
  return { blob, type };
};

export const prepareFile = Platform.select({
  ios: prepareImagePickerFileUpload,
  android: prepareImagePickerFileUpload,
  web: prepareWebFileUpload,
});

const arrayBufferToBlob = (arrayBuffer: ArrayBuffer, type = 'application/octet-stream'): Blob => {
  return new Blob([arrayBuffer], { type });
};

const stringToBlob = (str: string, type = 'text/plain'): Blob => {
  const encoder = new TextEncoder();
  const arrayBuffer = encoder.encode(str);
  return new Blob([arrayBuffer], { type });
};

export const toBlob = (data: string | ArrayBuffer, type: string): Blob => {
  if (typeof data === 'string') {
    return stringToBlob(data, type);
  }
  return arrayBufferToBlob(data, type);
};

/**
 * Detects if the media is a video based on type, uri, or file name
 * 
 * @param asset object with type, uri, and/or name properties
 * @returns boolean indicating if the asset is a video
 */
export const isVideoAsset = (asset: { 
  type?: string, 
  uri?: string, 
  name?: string
}): boolean => {
  // Check MIME type if available
  if (asset.type?.startsWith('video')) {
    return true;
  }
  
  // Check URI for common video extensions or data URLs
  if (asset.uri) {
    // Check data URLs
    if (asset.uri.startsWith('data:video/')) {
      return true;
    }
    
    // Check file extensions
    if (asset.uri.endsWith('.mp4') || 
        asset.uri.endsWith('.mov') || 
        asset.uri.endsWith('.quicktime')) {
      return true;
    }
  }
  
  // Check filename if available
  if (asset.name) {
    if (asset.name.endsWith('.mp4') || 
        asset.name.endsWith('.mov') || 
        asset.name.endsWith('.quicktime')) {
      return true;
    }
  }
  
  return false;
};

export async function pickImages(
  launchImageOpts?: Partial<ImagePicker.ImagePickerOptions>
) {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (permission) {
    const result = await ImagePicker.launchImageLibraryAsync({
      ...(launchImageOpts || {}),
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
    });

    if (!result.canceled) {
      return result;
    }
    return null;
  }
}

export async function pickVideos(
  launchVideoOpts?: Partial<ImagePicker.ImagePickerOptions>
) {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (permission) {
    const result = await ImagePicker.launchImageLibraryAsync({
      ...(launchVideoOpts || {}),
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
    });

    if (!result.canceled) {
      return result;
    }
    return null;
  }
}

export async function pickMedias(
  launchMediaOpts?: Partial<ImagePicker.ImagePickerOptions>
) {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (permission) {
    const result = await ImagePicker.launchImageLibraryAsync({
      ...(launchMediaOpts || {}),
      mediaTypes: ImagePicker.MediaTypeOptions.All,
    });

    if (!result.canceled) {
      return result;
    }
    return null;
  }
}

type CloudflareUploadResponse = {
  ok: boolean;
  status: number;
};

export async function uploadPicture(
  presignedUrl: string,
  blob: FileUpload
): Promise<CloudflareUploadResponse> {
  const response = await fetch(presignedUrl, {
    method: "PUT",
    headers: {},
    body: blob.blob,
  });
  return response as CloudflareUploadResponse;
}

// export async function takePictureAsync(
//   onSend: (images: { image: string }[]) => void
// ) {
//   if (await ImagePicker.requestCameraPermissionsAsync()) {
//     const result = await ImagePicker.launchCameraAsync({
//       allowsEditing: true,
//       aspect: [4, 3],
//     });
// 
//     if (!result.canceled) {
//       onSend([{ image: result.uri }]);
//       return result.uri;
//     }
//   }
// }

export const fileToPromise = (file: File): Promise<ProgressEvent<FileReader>> => {
  const reader = new FileReader();
  // this could have a timeout
  return new Promise((resolve, reject) => {
    reader.onload = async (e) => {
      try {
        resolve(e)
      } catch (e) {
        reject(e);
      }
    };
    reader.readAsArrayBuffer(file); // or readAsDataURL(file) if you need a base64 string
  });
}
