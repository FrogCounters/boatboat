const HealthBar: React.FC<{ health: number }> = ({ health }) => {
  return (
    <div className="relative w-full h-6 rounded-full bg-gray-600">
      <div
        className="h-6 rounded-full bg-red-500 transition-all"
        style={{ width: `${health}%` }}
      ></div>

      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-semibold text-gray-100">{health}%</span>
      </div>
    </div>
  );
};

export default HealthBar;
