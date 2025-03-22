import threading
import time

class Scheduler:
    def __init__(self,graph):
        self.G=graph

    def my_function(self):
        print("Function is running...")
        # Add your function logic here

    def run_periodically(self):
        while True:
            self.my_function()
            time.sleep(60 *60 *4)  # Sleep for 4 hours

    def start_thermal_comfort_thread(self):
        thread = threading.Thread(target=self.run_periodically, daemon=True)
        thread.start()