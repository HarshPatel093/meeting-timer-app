document.addEventListener('DOMContentLoaded', function(event) {
    const container = document.querySelector('.time-blocks-container');
    const meetingContainer = document.querySelector('.meetings-container');
    const meetingTimer = document.querySelector('.meeting-timer');
    const meetingTimerSubtext = document.querySelector('.meeting-timer-subtext');
    const addButton = document.querySelector('.add-button');
    const addMeetingButton = document.querySelector('.add-meeting-button');
    const uploadCsvButton = document.querySelector('.rounded-rectangular-button.agenda-button');
    const fileInput = document.createElement('input');
    const newButton = document.querySelector('.new-button');
    const timeBlocksDisplay = document.querySelector('.time-blocks-display');
    const meetingsDisplay = document.querySelector('.meetings-display');

    fileInput.type = 'file';
    fileInput.accept = '.csv';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);

    let countdownInterval = null;
    let timerRunning = false;
    let secondsRemaining = 0;
    let pausedTime = 0;
    let currentCountdown; // Variable to hold the current countdown interval

    newButton.addEventListener('click', function() {
       toggleDisplays();
    });

    addButton.addEventListener('click', function() {
        createTimeBlockRow();
    });

    addMeetingButton.addEventListener('click', function() {
        createMeetingRow();
    });

    meetingContainer.addEventListener('click', function(e) {
        if (e.target.closest('.select-block')) {
            const meetingRow = e.target.closest('.meeting-row');
            if (meetingRow) {
                const meetingName = meetingRow.querySelector('.meeting-name input').value;
                const meetingTime = meetingRow.querySelector('.meeting-time input').value;
                const meetingLink = meetingRow.querySelector('.meeting-link input').value;
                meetingTimerSubtext.textContent = meetingName;
                if (currentCountdown) {
                    clearInterval(currentCountdown);
                }
                currentCountdown = updateCountdown(meetingTime, meetingTimer, meetingLink);
            }
        } else if (e.target.closest('.delete-block')) {
            const meetingRow = e.target.closest('.meeting-row');
            meetingContainer.removeChild(meetingRow);
            resetTimerDisplay();
            if (currentCountdown) {
                clearInterval(currentCountdown);
                resetTimerDisplay();
            }
        } else if (e.target.closest('.join-block')) {
            const meetingRow = e.target.closest('.meeting-row');
            const meetingLink = meetingRow.querySelector('.meeting-link input').value;
            if (meetingLink) {
                window.open(meetingLink, '_blank');
            } else {
                alert("No meeting link provided.");
            }
        }
    });

    uploadCsvButton.addEventListener('click', function() {
        fileInput.click();
    });

    fileInput.addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (!file) {
            alert("No file chosen.");
            return;
        }
        const reader = new FileReader();
        reader.onload = function(e) {
            parseCsv(e.target.result);
        };
        reader.readAsText(file);
    });

    function toggleDisplays() {
        if (timeBlocksDisplay.style.display === 'none') {
            timeBlocksDisplay.style.display = 'block';
            meetingsDisplay.style.display = 'none';
        } else {
            timeBlocksDisplay.style.display = 'none';
            meetingsDisplay.style.display = 'block';
        }
    }

    function parseCsv(text) {
        const lines = text.split('\n');
        lines.forEach((line, index) => {
            if (index === 0) return; // Optionally skip the header
            const [name, minutes] = line.split(',');
            if (name && minutes) {
                createTimeBlockRow(name.trim(), minutes.trim());
            }
        });
    }

    function createTimeBlockRow(name = '', minutes = '') {
        const newRow = document.createElement('div');
        newRow.className = 'time-block-row';
        newRow.innerHTML = `
            <div class="time-block-name"><input type="text" placeholder="Name" value="${name}"></div>
            <div class="time-block-minutes"><input type="number" placeholder="Min" value="${minutes}"></div>
            <div class="time-block-actions">
                <button type="button" class="play-block"><img src="play_but.png" alt="Play"></button>
                <button type="button" class="delete-block"><img src="delete_but.png" alt="Delete"></button>
                <button type="button" class="extend-block"><img src="extend_but.png" alt="Extend"></button>
                <button type="button" class="advance-block"><img src="advance_but.png" alt="Advance"></button>
            </div>
        `;
        container.insertBefore(newRow, addButton);
    }

    function createMeetingRow(meetingName = '', link = '', time = '') {
        const newRow = document.createElement('div');
        newRow.className = 'meeting-row';
        newRow.innerHTML = `
            <div class="meeting-name"><input type="text" placeholder="Name" value="${meetingName}"></div>
            <div class="meeting-link"><input type="text" placeholder="Link" value="${link}"></div>
            <div class="meeting-time"><input type="datetime-local" value="${time}"></div>
            <div class="time-block-actions">
                <button type="button" class="select-block"><img src="select_but.png" alt="Select"></button>
                <button type="button" class="join-block"><img src="join_but.png" alt="Join"></button>
                <button type="button" class="delete-block"><img src="delete_but.png" alt="Delete"></button>
            </div>
        `;
        meetingContainer.insertBefore(newRow, addMeetingButton);
    }

    container.addEventListener('click', function(e) {
        if (e.target && (e.target.closest('.play-block'))) {
            handlePlayPause(e.target.closest('.play-block'));
        } else if (e.target && (e.target.closest('.delete-block'))) {
            const rowToDelete = e.target.closest('.time-block-row');
            container.removeChild(rowToDelete);
            resetTimerToDefault();
        } else if (e.target && (e.target.closest('.extend-block'))) {
            extendTimer(30);  // Extend by 30 seconds
        } else if (e.target && (e.target.closest('.advance-block'))) {
            advanceToNextTask(e.target.closest('.advance-block'));
        }
    });

    function handlePlayPause(button) {
        const img = button.querySelector('img');
        const row = button.closest('.time-block-row');
        const blockName = row.querySelector('.time-block-name input').value;
        const minutes = parseInt(row.querySelector('.time-block-minutes input').value, 10);

        const timerSubtext = document.querySelector('.timer-subtext');
        const timerDisplay = document.querySelector('.timer');
        timerSubtext.textContent = blockName;

        if (img.alt === "Play") {
            if (isNaN(minutes) || minutes <= 0) {
                alert('Please enter a valid number of minutes.');
                return;
            }
            resetAllPlayPauseButtons();
            clearInterval(countdownInterval);
            startTimer(minutes * 60, timerDisplay, button);
            img.src = 'pause_but.png';
            img.alt = 'Pause';
        } else {
            pauseTimer();
            img.src = 'play_but.png';
            img.alt = 'Play';
        }
    }

    function startTimer(duration, display, playPauseButton) {
        if (pausedTime > 0) {
            secondsRemaining = pausedTime;
            pausedTime = 0;
        } else {
            secondsRemaining = duration;
        }
        timerRunning = true;

        countdownInterval = setInterval(function() {
            let minutes = Math.floor(secondsRemaining / 60);
            let seconds = secondsRemaining % 60;
            display.innerHTML = `<span class="math-inline">${minutes.toString().padStart(2, '0')}</span>:${seconds.toString().padStart(2, '0')}`;
            if (--secondsRemaining < 0) {
                clearInterval(countdownInterval);
                timerRunning = false;
                alert('Time is up!');
                resetTimerToDefault();
                playPauseButton.querySelector('img').src = 'play_but.png';
                playPauseButton.querySelector('img').alt = 'Play';
            }
        }, 1000);
    }

    function pauseTimer() {
        clearInterval(countdownInterval);
        pausedTime = secondsRemaining; // Store remaining time on pause
        timerRunning = false;
    }

    function resetTimerToDefault() {
        const timerSubtext = document.querySelector('.timer-subtext');
        const timerDisplay = document.querySelector('.timer');
        timerSubtext.textContent = "--";
        timerDisplay.textContent = "00:00";
        clearInterval(countdownInterval);
        timerRunning = false;
        secondsRemaining = 0; // Reset remaining seconds
    }

    function extendTimer(seconds) {
        secondsRemaining += seconds; // Simply add seconds to the current timer
    }

    function advanceToNextTask(advanceButton) {
        const currentRow = advanceButton.closest('.time-block-row');
        const nextRow = currentRow.nextElementSibling;

        // First, pause and reset the current task's timer and button
        pauseTimer();
        const currentPlayButton = currentRow.querySelector('.play-block img');
        currentPlayButton.src = 'play_but.png';
        currentPlayButton.alt = 'Play';

        if (nextRow) {
            const playButton = nextRow.querySelector('.play-block');
            if (playButton) {
                const minutesInput = nextRow.querySelector('.time-block-minutes input');
                const minutes = parseInt(minutesInput.value, 10);
                if (isNaN(minutes) || minutes <= 0) {
                    alert('Please enter a valid number of minutes for the next task.');
                    return;
                }
                resetTimerToDefault(); // Reset the current timer display and status
                pausedTime = 0; // Clear any paused time

                const blockNameInput = nextRow.querySelector('.time-block-name input');
                const blockName = blockNameInput.value; // Get the name of the next task
                document.querySelector('.timer-subtext').textContent = blockName; // Update the display with the new task's name

                startTimer(minutes * 60, document.querySelector('.timer'), playButton); // Start the new task with its full duration
                playButton.querySelector('img').src = 'pause_but.png';
                playButton.querySelector('img').alt = 'Pause';
            }
        }
    }

    function resetAllPlayPauseButtons() {
        const allPlayButtons = document.querySelectorAll('.play-block img');
        allPlayButtons.forEach(button => {
            button.src = 'play_but.png'; // Update the path if necessary
            button.alt = 'Play';
        });
    }

    function updateCountdown(meetingTime, displayElement, meetingLink) {
        const endTime = new Date(meetingTime).getTime();
        let notificationShown = false; // Flag to ensure the 10-second notification is shown only once
        let redirectNotificationShown = false; // Flag to ensure the meeting redirect notification is shown only once
    
        // Clear any existing countdown interval
        if (currentCountdown) {
            clearInterval(currentCountdown);
        }
    
        currentCountdown = setInterval(function() {
            const now = new Date().getTime();
            const distance = endTime - now;
    
            // Check if it's time to show the 10-second notification
            if (distance > 0 && distance <= 10000 && !notificationShown) {
                alert('Meeting starts in 10 seconds!');
                notificationShown = true; // Set flag to true after showing the notification
            }
    
            // If the countdown has ended, display the redirect notification
            if (distance < 0 && !redirectNotificationShown) {
                clearInterval(currentCountdown); // Clear the interval
                displayElement.textContent = "00:00"; // Reset the display
                redirectNotificationShown = true; // Set flag to true after showing the redirect notification
                alert('Meeting time has passed. Redirecting to the meeting link...');
                window.open(meetingLink, '_blank'); // Open the meeting link
            } else if (distance >= 0) {
                // Update the display with the remaining time
                const days = Math.floor(distance / (1000 * 60 * 60 * 24));
                const hoursFromDays = days * 24;
                const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const totalHours = hoursFromDays + hours;
                const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((distance % (1000 * 60)) / 1000);
    
                displayElement.textContent = `${totalHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
        }, 1000);
    }
    
    
    function autoTransitionToNextMeeting() {
        const currentMeeting = document.querySelector('.meeting-row-highlighted'); // This will need a method to highlight current meeting row
        const nextMeeting = currentMeeting && currentMeeting.nextElementSibling;

        if (nextMeeting) {
            const selectButton = nextMeeting.querySelector('.select-block');
            if (selectButton) {
                selectButton.click(); // Simulate click to automatically select the next meeting
            }
        }
    }

    function resetTimerDisplay() {
        if (meetingTimer && meetingTimerSubtext) {
            meetingTimer.textContent = "00:00"; // Reset timer display
            meetingTimerSubtext.textContent = "--"; // Reset timer subtext
        }
    }
});
