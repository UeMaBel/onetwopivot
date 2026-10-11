# onetwopivot Product Context

Language for the first release of the movement analysis product.

## Training

**Drill**:
A defined movement exercise that a person performs for analysis.
_Avoid_: Challenge (when referring to the exercise itself)

**Training session**:
One attempt by a person to perform a drill, including the movement data and resulting analysis.
_Avoid_: Video (the session may exist without a retained video)

**Guest**:
A person using the app without an account, identified in the ranking by a device-local anonymous ID and represented by a chosen display name.
_Avoid_: Account (a guest has no registered account)

**Telemetry**:
Time-ordered pose landmark measurements derived from a training session.
_Avoid_: Raw video

**Reference baseline**:
A target or example used to compare a person's movement during a drill.
_Avoid_: Creator challenge (unless creator authorship is essential to the discussion)

**Challenge**:
A packaged experience built around a drill, potentially including creator material, a reference baseline, and a leaderboard.
_Avoid_: Drill (when referring to the package rather than the exercise)

**Leaderboard result**:
A recorded outcome for a person's attempt at a drill or challenge, interpreted under the drill and scoring versions that produced it.
_Avoid_: Score (when referring to the full ranked record)

## Boxing

**Jab**:
A straight punch thrown with the lead hand.

**Straight**:
A straight punch thrown with the rear hand; this project uses *straight* for the punch often called a cross.
_Avoid_: Cross (as the preferred project term)

**Lead hand**:
The hand positioned forward in a boxer's stance.
_Avoid_: Left hand (when the boxer's stance may be southpaw)

**Rear hand**:
The hand positioned behind the lead hand in a boxer's stance.

**Lead side**:
The side of the boxer where the lead hand is positioned in the current stance; it may be the left or right side of the body.

**Rear side**:
The side of the boxer where the rear hand is positioned in the current stance; it may be the left or right side of the body.

**Punch number**:
A shorthand for one of six basic punches: **1** jab, **2** rear straight, **3** lead hook, **4** rear hook, **5** lead uppercut, and **6** rear uppercut. Numbering can vary between gyms; this project uses this mapping.

**Body punch**:
A punch aimed at the body rather than the head. Add the suffix `b` to a punch number to indicate a body punch, such as **1b** for a body jab or **6b** for a rear uppercut to the body.

**Head punch**:
A punch aimed at the head.

**Slip**:
A defensive head movement away from a punch line. Benchmark labels specify direction relative to stance as `lead_slip` or `rear_slip`.

**Roll**:
A defensive movement that moves the head under and around a punch. Benchmark labels specify direction relative to stance as `lead_roll` or `rear_roll`.
