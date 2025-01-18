import { useSearchParams } from "react-router";

const Join = function() {
  const [searchParams] = useSearchParams();
  const shipId = searchParams.get("shipId");
  return (
    <main className="w-screen min-h-screen">
      Ship Id: {shipId}
    </main>
  );
}

export default Join;
