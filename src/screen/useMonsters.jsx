import { useEffect, useState } from 'react';
import { db } from '../firebaseConfig';

const useMonsters = () => {
    const [leftMonsters, setLeftMonsters] = useState([]);
    const [rightMonsters, setRightMonsters] = useState([]);

    useEffect(() => {
        let existingLeftMonsterIds = new Set();
        let existingRightMonsterIds = new Set();
        let newLeftMonsters = [];
        let newRightMonsters = [];

        const unsubscribeLeft = db.collection('left').onSnapshot((snapshot) => {
            const updatedMonsters = snapshot.docs
                .map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        side: 'left',
                        firestorePath: doc.ref.path,
                        ...data
                    };
                })
                .filter(monster => monster.IsAlive && !monster.Goal);
            newLeftMonsters = updatedMonsters.filter(monster => !existingLeftMonsterIds.has(monster.id));
            existingLeftMonsterIds = new Set(updatedMonsters.map(monster => monster.id));
            setLeftMonsters((prev) => [...prev, ...newLeftMonsters]);
        });

        const unsubscribeRight = db.collection('right').onSnapshot((snapshot) => {
            const updatedMonsters = snapshot.docs
                .map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        side: 'right',
                        firestorePath: doc.ref.path,
                        ...data
                    };
                })
                .filter(monster => monster.IsAlive && !monster.Goal);

            newRightMonsters = updatedMonsters.filter(monster => !existingRightMonsterIds.has(monster.id));
            existingRightMonsterIds = new Set(updatedMonsters.map(monster => monster.id));
            setRightMonsters((prev) => [...prev, ...newRightMonsters]);
        });

        return () => {
            unsubscribeLeft();
            unsubscribeRight();
        };
    }, []);

    return { leftMonsters, rightMonsters };
};

export default useMonsters;
