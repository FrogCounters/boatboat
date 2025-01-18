import { IDetectedBarcode, Scanner } from "@yudiel/react-qr-scanner";
import { useNavigate } from "react-router";

const Mobile = () => {
  const navigate = useNavigate();
  const onScan = (detectedCodes: IDetectedBarcode[]) => {
    if (detectedCodes.length < 1) return;
    const shipId = detectedCodes[0].rawValue;
    navigate(`/join?shipId=${shipId}`);
  }

  return (
    <main className="w-screen min-h-screen bg-black flex-col justify-center">
      <div className="h-32 w-full flex justify-center items-center">
        <h2 className="text-3xl text-white">Aye, scan that QR code</h2>
      </div>
      <div className="">
        <Scanner onScan={onScan} allowMultiple={true} />
      </div>
    </main>
  )
};

export default Mobile;
