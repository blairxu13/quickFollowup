import { Bone } from "lucide-react";
import { useEffect, useState } from "react";

export default function Petsystem() {
  const [userId, setUserId] = useState(null);
  const [petInfo, setPetInfo] = useState([]);   // array to map when user has no pet
  const [storeInfo, setStoreInfo] = useState([]); // simple placeholder when user has a pet
  const [expandedId, setExpandedId] = useState(null); // toggle description per card
  const [open, setOpen] = useState(false);       // toggle Bone drawer

  useEffect(() => {
    chrome.storage.local.get(["user_id"], (r) => setUserId(r.user_id ?? null));
  }, []);

  const checkUserPetInfo = async () => {
    const res = await fetch("http://localhost:8000/static_pet");
    const data = await res.json(); // expect: [{ pet_uuid, name, description, image_url }, ...]
    setPetInfo(Array.isArray(data) ? data : []);
  };

  async function fetchApplications(uid) {
    const res = await fetch(
      `http://localhost:8000/get_user_pet_info?user_id=${encodeURIComponent(uid)}`
    );
    if (!res.ok) throw new Error("fetch failed");
    const data = await res.json();
    if (!data || data.length === 0) {
      await checkUserPetInfo();            // no pet → show adoption grid
      setStoreInfo([]);                    // ensure store hidden
    } else {
      setPetInfo([]);                      // hide adoption grid
      setStoreInfo(["food1", "food2"]);    // has pets → show store
    }
  }



  async function adoptPet(pet) {
    if (!userId) return;
    // prefer using a stable ID if you have it (pet.pet_uuid). If not, send name and resolve server-side.
    const body = {
      user_id: userId,
      pet_name: pet.name  // if you only have pet.name, send that and resolve on backend
    };
    const res = await fetch("http://localhost:8000/adopt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      return;
    }
    //launch the app
    const link = `quickfollowup://?user_id=${encodeURIComponent(userId)}`;
    window.location.href = link;
    
    setPetInfo([]);
    setExpandedId(null);
    setStoreInfo(["food1", "food2"]);
  }






  return (
    <div className="p-3">
      <Bone
        className="cursor-pointer"
        onClick={async () => {
          if (!userId) return;
          if (!open) {
            await fetchApplications(userId); // open & fetch
            setOpen(true);
          } else {
            // close & clear
            setPetInfo([]);
            setStoreInfo([]);
            setExpandedId(null);
            setOpen(false);
          }
        }}
      />

      {/* Adoption grid (no pet) */}
      {petInfo.length > 0 && (
        <div className="mt-4 flex gap-3 overflow-x-auto">
          {petInfo.map((pet) => (
            <div key={pet.pet_uuid} className="bg-white rounded-xl shadow p-2 min-w-[150px]">
              <div className="aspect-square overflow-hidden rounded-lg">
                <img
                  src={pet.image_url}
                  alt={pet.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="mt-2 text-sm font-semibold">{pet.name}</div>

              <button
                className="text-xs mt-1 underline"
                onClick={() =>
                  setExpandedId(expandedId === pet.pet_uuid ? null : pet.pet_uuid)
                }
              >
                Details
              </button>

              {expandedId === pet.pet_uuid && (
                <p className="mt-1 text-xs text-gray-600">{pet.description}</p>
              )}

              <button
                className="mt-2 w-full py-1 text-xs bg-black text-black rounded-lg"
                onClick={() => adoptPet(pet)}
              >
                Adopt
              </button>
            </div>
          ))}
        </div>
      )}
      {/* Store (has pet) */}
      {storeInfo.length > 0 && (
        <div className="mt-4">
          <p className="font-bold mb-2">Store</p>
          <ul className="space-y-2">
            {storeInfo.map((item) => (
              <li
                key={item}
                className="flex items-center justify-between bg-white p-2 rounded shadow"
              >
                <span className="text-sm">{item}</span>
                <button className="text-xs px-2 py-1 bg-black text-white rounded">
                  Buy
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
