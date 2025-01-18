interface User {
  name: string;
  point: number;
  rank: number;
  uid: string;
}

const Leaderboard: React.FC<{ users: User[]; uid: string }> = ({
  users,
  uid,
}) => {
  const currentUser = users.find((user) => user.uid === uid);
  const isTop5 = currentUser ? currentUser.rank <= 5 : false;

  const displayedUsers = isTop5
    ? users.slice(0, 5)
    : [...users.slice(0, 4), ...(currentUser ? [currentUser] : [])];

  return (
    <div className="p-2 rounded-sm shadow-sm w-[16vw] mx-auto">
      <div className="space-y-2">
        {displayedUsers.map((user) => (
          <div
            key={user.rank}
            className={`flex items-center justify-between p-2 rounded-sm shadow-md transition-shadow ${
              user.uid === uid
                ? "bg-green-100 hover:shadow-xl"
                : "bg-white hover:shadow-sm"
            }`}
          >
            <div className="flex items-center space-x-2">
              <div className="flex items-center justify-center w-8 h-8 bg-blue-500 text-white font-bold rounded-full">
                {user.rank}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">{user.name}</p>
              </div>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-700">{user.point}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Leaderboard;
