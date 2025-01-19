import ducky from "../assets/ducky.png";
import pirate from "../assets/pirate.png";

const HealthBar: React.FC<{ yourHealth: number; opponentHealth: number }> = ({
  yourHealth,
  opponentHealth,
}) => {
  const yourHearts = Array(Math.floor(yourHealth / 10)).fill(ducky);
  const opponentsHearts = Array(Math.floor(opponentHealth / 10)).fill(pirate);

  return (
    <div>
      <div>
        <span className="font-bold mb-1 block">Your Health</span>
        <div className="flex">
          {yourHearts.map((yourHeart, index) => (
            <img
              key={index}
              src={yourHeart}
              alt={`heart ${index + 1}`}
              style={{ width: "30px", height: "30px", marginRight: "5px" }}
            />
          ))}
        </div>
      </div>

      <div className="mt-3">
        <span className="font-bold mb-1 block">Opponent's Health</span>
        <div className="flex">
          {opponentsHearts.map((yourHeart, index) => (
            <img
              key={index}
              src={yourHeart}
              alt={`heart ${index + 1}`}
              style={{ width: "30px", height: "30px", marginRight: "5px" }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default HealthBar;
