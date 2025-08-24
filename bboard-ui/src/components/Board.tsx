'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { type ContractAddress } from '@midnight-ntwrk/compact-runtime';
import { type BBoardDerivedState, type DeployedBBoardAPI } from '../../../api/src/index';
import { useDeployedBoardContext } from '../hooks';
import { type BoardDeployment } from '../contexts';
import { type Observable } from 'rxjs';
import Webcam from 'react-webcam';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Interfaces
interface ExtractedData {
  nombre: string;
  apellido: string;
  nacionalidad: string;
  fechaNacimiento: string;
}

interface ButtonProps {
  onClick: () => void;
  isActive: boolean;
  children: React.ReactNode;
}

// Estilos reutilizables
export const styles = {
  container: {
    fontFamily: 'sans-serif',
    maxWidth: '600px',
    margin: 'auto',
    padding: '20px',
    border: '1px solid #ccc',
    borderRadius: '8px',
    backgroundColor: '#fff'
  },
  button: (isActive: boolean) => ({
    padding: '10px 20px',
    fontSize: '14px',
    backgroundColor: isActive ? '#007bff' : '#f8f9fa',
    color: isActive ? 'white' : '#333',
    border: '1px solid #dee2e6',
    borderRadius: '4px',
    cursor: 'pointer'
  }),
  uploadArea: {
    border: '2px dashed #dee2e6',
    borderRadius: '8px',
    padding: '20px',
    textAlign: 'center' as const,
    backgroundColor: '#f8f9fa'
  },
  resultContainer: {
    marginTop: '20px',
    padding: '20px',
    border: '1px solid #dee2e6',
    borderRadius: '8px',
    backgroundColor: '#f8f9fa',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
  },
  resultItem: {
    padding: '10px',
    backgroundColor: 'white',
    borderRadius: '4px',
    border: '1px solid #e9ecef'
  }
};


interface OcrResult {
  nombre?: string;
  apellido?: string;
  nacionalidad?: string;
  fechaNacimiento?: string;
  edad?: number;
}


/** The props required by the {@link Board} component. */
export interface BoardProps {
  /** The observable bulletin board deployment. */
  boardDeployment$?: Observable<BoardDeployment>;
}


function hexToBytes(hex: string): Uint8Array {
  const clean = hex.trim().toLowerCase().replace(/^0x/, "");
  if (!/^[0-9a-f]*$/.test(clean) || clean.length % 2 !== 0) {
    throw new Error("Hex inválido");
  }
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.substr(i * 2, 2), 16);
  }
  return out;
}

// (opcional) exigir largo exacto
function expectLen(u8: Uint8Array, len: number, label = "bytes"): Uint8Array {
  if (u8.length !== len) throw new Error(`${label} debe tener ${len} bytes, tiene ${u8.length}`);
  return u8;
}
const hex = "8f24d209ca61d8b2ecf641583d63c0b072558a9653059e6e3b7586e42d4a31c3";
const bytes32 = expectLen(hexToBytes(hex), 32, "clave");
const country2 = new Uint8Array([..."AR"].map(c => c.charCodeAt(0)));


// --- Configuración de la API de Gemini ---
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

// Componente de botón reutilizable
const SwitchButton: React.FC<ButtonProps> = ({ onClick, isActive, children }) => (
  <button
    onClick={onClick}
    style={styles.button(isActive)}
  >
    {children}
  </button>
);





export const Board: React.FC<Readonly<BoardProps>> = ({ boardDeployment$ }) => {
  const boardApiProvider = useDeployedBoardContext();
  const [boardDeployment, setBoardDeployment] = useState<BoardDeployment>();
  const [deployedBoardAPI, setDeployedBoardAPI] = useState<DeployedBBoardAPI>();
  const [errorMessage, setErrorMessage] = useState<string>();
  const [boardState, setBoardState] = useState<BBoardDerivedState>();
  const [messagePrompt, setMessagePrompt] = useState<string>();
  const [isWorking, setIsWorking] = useState(!!boardDeployment$);
  const [image, setImage] = useState<File | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [useWebcam, setUseWebcam] = useState<boolean>(false);
  const webcamRef = useRef<Webcam | null>(null);

  // Convierte un objeto File a una parte de la API de Gemini
  const fileToGenerativePart = async (file: File) => {
    const base64EncodedData = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.readAsDataURL(file);
    });
    return {
      inlineData: { data: base64EncodedData, mimeType: file.type },
    };
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      setExtractedData(null);
      setError(null);
    }
  };

  const delay = (ms: number) => new Promise(res => setTimeout(res, ms))

  const handleVerifyClick = async () => {
    if (!image) {
      setError('Por favor, selecciona una imagen primero.');
      return;
    }

    setLoading(true);
    setError(null);
    setExtractedData(null);

    try {
      const prompt = `
      Analiza la imagen de este documento de identidad (DNI). Extrae únicamente los siguientes datos y devuélvelos en formato JSON. No incluyas ninguna otra explicación o texto introductorio, solo el objeto JSON.
      1.  nombre (string)
      2.  apellido (string)
      3.  nacionalidad (string) el código de país ISO 3166-1 alfa-2. Por ejemplo: AR para Argentina, US para Estados Unidos.
      4.  fechaNacimiento (string) en formato YYYY-MM-DD.

      Ejemplo de respuesta:
      {
        "nombre": "Juan",
        "apellido": "Perez",
        "nacionalidad": "AR",
        "fechaNacimiento": "1990-05-15"
      }
      `;

      const imagePart = await fileToGenerativePart(image);
      const result = await model.generateContent([prompt, imagePart]);
      const response = await result.response;
      const text = response.text();

      const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsedData = JSON.parse(jsonString) as ExtractedData;
      setExtractedData(parsedData);
      await delay(3000)
      onPostMessage()
    } catch (e) {
      console.error(e);
      setError('Ocurrió un error al procesar la imagen. Asegúrate de que la imagen sea clara y que la API key sea correcta.');
    } finally {
      setLoading(false);
    }
  };

  const captureImage = () => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      fetch(imageSrc)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], "webcam-capture.jpg", { type: "image/jpeg" });
          setImage(file);
          setUseWebcam(false);
        });
    }
  };

  // Two simple callbacks that call `resolve(...)` to either deploy or join a bulletin board
  // contract. Since the `DeployedBoardContext` will create a new board and update the UI, we
  // don't have to do anything further once we've called `resolve`.
  const onCreateBoard = useCallback(() => boardApiProvider.resolve(), [boardApiProvider]);
  const onJoinBoard = useCallback(
    (contractAddress: ContractAddress) => boardApiProvider.resolve(contractAddress),
    [boardApiProvider],
  );

  // LLAMA A ENROLLONCE
  const onPostMessage = useCallback(async () => {
    try {
      
      if (deployedBoardAPI) {
        setIsWorking(true);
        
        await deployedBoardAPI.enrollOnce();
        console.log("Pollo 3")
      }
    } catch (error: unknown) {
      alert(error)
    console.log(error)
      setErrorMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setIsWorking(false);
    }
  }, [deployedBoardAPI, setErrorMessage, setIsWorking, messagePrompt]);

  const onCopyContractAddress = useCallback(async () => {
    if (deployedBoardAPI) {
      await navigator.clipboard.writeText(deployedBoardAPI.deployedContractAddress);
    }
  }, [deployedBoardAPI]);

  // Subscribes to the `boardDeployment$` observable so that we can receive updates on the deployment.
  useEffect(() => {
    if (!boardDeployment$) {
      return;
    }

    const subscription = boardDeployment$.subscribe(setBoardDeployment);

    return () => {
      subscription.unsubscribe();
    };
  }, [boardDeployment$]);

  // Subscribes to the `state$` observable on a `DeployedBBoardAPI` if we receive one, allowing the
  // component to receive updates to the change in contract state; otherwise we update the UI to
  // reflect the error was received instead.
  useEffect(() => {
    if (!boardDeployment) {
      return;
    }
    if (boardDeployment.status === 'in-progress') {
      return;
    }

    setIsWorking(false);

    if (boardDeployment.status === 'failed') {
      setErrorMessage(
        boardDeployment.error.message.length ? boardDeployment.error.message : 'Encountered an unexpected error.',
      );
      return;
    }

    // We need the board API as well as subscribing to its `state$` observable, so that we can invoke
    // the `post` and `takeDown` methods later.
    setDeployedBoardAPI(boardDeployment.api);
    const subscription = boardDeployment.api.state$.subscribe(setBoardState);
    return () => {
      subscription.unsubscribe();
    };
  }, [boardDeployment, setIsWorking, setErrorMessage, setDeployedBoardAPI]);










  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if device is mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    // Check initially
    checkMobile();

    // Add resize listener
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const capture = useCallback(() => {
    const image = webcamRef.current?.getScreenshot();
    if (image) {
      setImageSrc(image);
      setOcrResult(null);
    }
  }, [webcamRef]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageSrc(reader.result as string);
        setOcrResult(null);
        // Auto-trigger verification on mobile
        if (isMobile) {
          handleVerify(reader.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleVerify = async (e?: React.MouseEvent | string) => {
    if (e && typeof e !== 'string' && 'preventDefault' in e) {
      e.preventDefault();
    }
    const srcToUse = (typeof e === 'string' ? e : imageSrc);
    if (!srcToUse) return;

    setIsLoading(true);
    setError(null);
    setOcrResult(null);

    try {
      const response = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: srcToUse }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error);
      }

      const data: OcrResult = await response.json();
      setOcrResult(data);

    } catch (err: any) {
      setError(err.message || 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div style={styles.container}>
        <h2 style={{ textAlign: 'center', color: '#333' }}>Verificación KYC</h2>
        <p style={{ textAlign: 'center', color: '#666' }}>
          Sube una imagen de un documento de identidad (DNI, pasaporte, etc.)
        </p>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', justifyContent: 'center' }}>
          <SwitchButton onClick={() => setUseWebcam(false)} isActive={!useWebcam}>
            Subir Archivo
          </SwitchButton>
          <SwitchButton onClick={() => setUseWebcam(true)} isActive={useWebcam}>
            Usar Cámara
          </SwitchButton>
        </div>

        {!useWebcam ? (
          <div style={{ marginBottom: '15px' }}>
            <div style={styles.uploadArea}>
              <label htmlFor="image-upload" style={{ display: 'block', cursor: 'pointer', color: '#007bff' }}>
                📁 Haz clic aquí para seleccionar un archivo
                <input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
          </div>
        ) : (
          <div style={{ marginBottom: '15px', textAlign: 'center' }}>
            <Webcam
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              style={{ width: '100%', maxWidth: '400px', borderRadius: '8px' }}
            />
            <button
              onClick={captureImage}
              style={{
                marginTop: '10px',
                padding: '10px 20px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              📸 Capturar Foto
            </button>
          </div>
        )}

        {image && !useWebcam && (
          <div style={{ textAlign: 'center', marginBottom: '15px' }}>
            <img
              src={URL.createObjectURL(image)}
              alt="ID preview"
              style={{
                maxWidth: '100%',
                maxHeight: '300px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            />
          </div>
        )}

        <button
          onClick={handleVerifyClick}
          disabled={!image || loading}
          style={{
            width: '100%',
            padding: '10px',
            fontSize: '16px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: image && !loading ? 'pointer' : 'not-allowed',
            opacity: image && !loading ? 1 : 0.7
          }}
        >
          {loading ? 'Verificando...' : 'Verificar Identidad'}
        </button>

        {error && (
          <div style={{ marginTop: '15px', color: 'red', textAlign: 'center' }}>
            {error}
          </div>
        )}

        {extractedData && (
          <div style={styles.resultContainer}>
            <h3 style={{ color: '#333', marginBottom: '15px' }}>Resultados de la Verificación:</h3>
            <div style={{ display: 'grid', gap: '10px', fontSize: '16px', color: '#333' }}>
              <div style={styles.resultItem}>
                <strong>Nombre:</strong> {extractedData.nombre || 'No encontrado'}
              </div>
              <div style={styles.resultItem}>
                <strong>Apellido:</strong> {extractedData.apellido || 'No encontrado'}
              </div>
              <div style={styles.resultItem}>
                <strong>Nacionalidad:</strong> {extractedData.nacionalidad || 'No encontrada'}
              </div>
              <div style={styles.resultItem}>
                <strong>Fecha de Nacimiento:</strong> {extractedData.fechaNacimiento || 'No encontrada'}
              </div>
            </div>
            {/* <button onClick={() => { onPostMessage() }}>KYC </button> */}
          </div>
        )}
      </div>
      {deployedBoardAPI ? 
      <>
      
      </>:
      <>
      Loading...
      </>
    }
    </>
  );
};

/** @internal */
const toShortFormatContractAddress = (contractAddress: ContractAddress | undefined): React.ReactElement | undefined =>
  // Returns a new string made up of the first, and last, 8 characters of a given contract address.
  contractAddress ? (
    <span data-testid="board-address">
      0x{contractAddress?.replace(/^[A-Fa-f0-9]{6}([A-Fa-f0-9]{8}).*([A-Fa-f0-9]{8})$/g, '$1...$2')}
    </span>
  ) : undefined;
