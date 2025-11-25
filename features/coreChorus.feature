@core 
Feature: Chorus SS&C Portal Core functionality

@core-scenario1
 Scenario: User launch SSC Portal, create a Document Type, enter main and recipient emails.
   Given I launch the Chorus portal for "TestCase6"
   When I login with username and password for "TestCase6"
   When I create a new worklist
   Then I select following options in the new worklist for "TestCase6"
   When I double click to open the created work item for "TestCase6"
   Then I select Document type from form for "TestCase6"
   Then I enter multiple usenames and passwords for "TestCase6"


 @core-scenario2
 Scenario: AWD-72227 - COM-PRE-Create Communications User
   # Create User
   Given Login into Chorus with username and password
   When Navigate to the Administration workspace
   Then Navigate to Manage-Work Place-User-Search for and select user from the list
   Then Rename the fields to your new users info
   Then Select Insert
   # User ID Profile Clone
   Then From the Work Place Menu select User ID Profile Clone
   Then Search for and Select the From User and the To User as your user created
   Then Check All User Privileges and Roles checkboxes
   Then Click Clone
   Then System displays a message that the Clone was completed
   Then Select Continue
   # Create Communications User
   Then Navigate to Manage Workplace Communications user
   Then Click on Create New User
   Then In the ID field enter your userid which you created above
   Then Select Administrator from the Roles dropdown
   Then Select Save
   Then I enable the Status of the new user to Available
   Then Communications user should be created and you are now good to login with the user to use communications